import type { ExploreSpeciesPayload } from "@/lib/explore-species";
import type { SpeciesWikiAnchor } from "@/lib/species-wiki-anchor";
import {
  taxonLatinKeywords,
  type ResolvedTaxonIdentity,
} from "@/lib/species-wikidata-taxon";

export type AnchorContentMismatch = {
  reason: string;
  retryHint: string;
};

function extractLatinTokens(text: string): string[] {
  const tokens: string[] = [];
  for (const m of text.matchAll(/\b([A-Z][a-z]+(?:idae|inae|oidea|iformes)?)\b/g)) {
    tokens.push(m[1]!);
  }
  for (const m of text.matchAll(/\b([A-Z][a-z]+\s+[a-z]+)\b/g)) {
    tokens.push(m[1]!);
  }
  return [...new Set(tokens)];
}

function latinRoots(keywords: string[]): string[] {
  return [...new Set(keywords.map((k) => k.trim().split(/\s+/)[0]!).filter((s) => s.length >= 4))];
}

function outputMatchesExpected(outputLatin: string[], expected: string[]): boolean {
  if (!expected.length) return true;
  const roots = latinRoots(expected);
  return outputLatin.some((out) =>
    roots.some(
      (root) =>
        out.toLowerCase().startsWith(root.toLowerCase()) ||
        root.toLowerCase().startsWith(out.toLowerCase()),
    ),
  );
}

function formatIdentityBrief(identity: ResolvedTaxonIdentity): string {
  const chain = [...identity.lineage]
    .reverse()
    .map((n) => n.scientificName || n.labelEn || n.labelZh)
    .filter(Boolean)
    .join(" → ");
  return chain || identity.scientificName || identity.labelEn || identity.wikibaseId;
}

function isPlaceholderScientificName(value: string): boolean {
  return /^(未知|unknown|n\/a|暂无|无|不明确|待考)$/i.test(value.trim());
}

function isPlaceholderTaxon(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  const unknownHits = (t.match(/未知/g) ?? []).length;
  return unknownHits >= 3 || /^纲[：:]\s*未知/.test(t);
}

function anchorHasVerifiedIdentity(anchor: SpeciesWikiAnchor | null): boolean {
  if (!anchor) return false;
  if (anchor.identityNote && anchor.scientificNameHint) return true;
  if (anchor.resolvedTaxon?.scientificName) return true;
  if (anchor.scientificNameHint && !isPlaceholderScientificName(anchor.scientificNameHint)) {
    return true;
  }
  if (
    anchor.contentSource === "baidu" &&
    anchor.referenceBody &&
    anchor.referenceBody.length >= 400
  ) {
    return true;
  }
  return Boolean(anchor.zhTitle && (anchor.zhExtract?.length ?? 0) > 40);
}

/**
 * 维基已命中但模型输出「未知」空壳时触发重试。
 */
export function detectPlaceholderUnknownPayload(
  payload: ExploreSpeciesPayload,
  anchor: SpeciesWikiAnchor | null,
): AnchorContentMismatch | null {
  if (!anchorHasVerifiedIdentity(anchor)) return null;

  const sciBad = isPlaceholderScientificName(payload.scientificName);
  const taxonBad = isPlaceholderTaxon(payload.taxon);
  const summaryBad =
    /无法确认|无法核实|缺乏可靠|信息不足|尚无权威|不能确认/.test(payload.summary) &&
    payload.bodyMarkdown.length < 600;

  if (!sciBad && !taxonBad && !summaryBad) return null;

  const hint =
    anchor?.scientificNameHint ??
    anchor?.resolvedTaxon?.scientificName ??
    anchor?.zhTitle ??
    "已锚定物种";
  const wikiNote = anchor?.zhExtract ? `\n百科摘要：${anchor.zhExtract.slice(0, 200)}` : "";
  const enNote = anchor?.enWikiExtract
    ? `\n英文维基摘要：${anchor.enWikiExtract.slice(0, 200)}`
    : "";
  const baiduNote =
    anchor?.contentSource === "baidu" && anchor.referenceBody
      ? `\n百度百科参考（节选）：${anchor.referenceBody.slice(0, 500)}`
      : "";

  return {
    reason: "百科已锚定物种，但模型输出未知/空壳内容。",
    retryHint: `上次输出将 scientificName 或分类标为「未知」，与系统已确认的百科条目（${hint}）矛盾。${wikiNote}${enNote}${baiduNote}\n请按百科与学名提示撰写完整图鉴；scientificName 须为真实学名，taxon 须写出纲/目/科/属/种，不得整篇写「记载较少/无法确认」。`,
  };
}

/**
 * 比对「系统已解析的分类链」与模型输出中的拉丁分类信息是否一致。
 * 不针对具体物种写死禁词，仅检测输出是否脱离锚定链。
 */
export function detectAnchorContentMismatch(
  payload: ExploreSpeciesPayload,
  anchor: SpeciesWikiAnchor | null,
): AnchorContentMismatch | null {
  const identity = anchor?.resolvedTaxon;
  const blob = [
    payload.scientificName,
    payload.taxon,
    payload.summary,
    payload.habitat,
    payload.bodyMarkdown,
  ].join("\n");

  const outputLatin = extractLatinTokens(blob);
  const expectedFromWd = identity ? taxonLatinKeywords(identity) : [];
  const expectedFromHint = anchor?.scientificNameHint ? [anchor.scientificNameHint] : [];
  const expected = [...new Set([...expectedFromWd, ...expectedFromHint])];

  if (expected.length >= 1) {
    const outputEmptyLatin = outputLatin.length === 0;
    const sciBad = isPlaceholderScientificName(payload.scientificName);
    if (outputEmptyLatin && sciBad) {
      const brief = identity ? formatIdentityBrief(identity) : expected.join("、");
      return {
        reason: "正文未包含锚定学名，且 scientificName 为未知。",
        retryHint: `系统已确认分类链（${brief}）。scientificName 须使用该学名；taxon 沿此链展开，不得填「未知」。`,
      };
    }
    if (outputLatin.length >= 1 && !outputMatchesExpected(outputLatin, expected)) {
      const brief = identity ? formatIdentityBrief(identity) : expected.join("、");
      return {
        reason: "正文中的拉丁分类信息与系统锚定链不一致。",
        retryHint: `上次输出的学名/分类（如 ${outputLatin.slice(0, 3).join("、")}）与系统已确认的分类链（${brief}）不符。请严格按【系统已确认的分类身份】重写 JSON；scientificName 与 taxon 须沿该分类链展开，不得换成其它目/科/属。`,
      };
    }
  }

  if (identity && identity.rank !== "species" && identity.scientificName) {
    const sci = payload.scientificName.trim();
    const root = identity.scientificName.split(/\s+/)[0] ?? "";
    const sciRoot = sci.split(/\s+/)[0] ?? "";
    if (
      sciRoot &&
      root &&
      sciRoot !== root &&
      !outputMatchesExpected([sci], [identity.scientificName])
    ) {
      return {
        reason: `查询解析为 ${identity.rank} 级分类单元，但 scientificName 未对应该等级。`,
        retryHint: `「${anchor?.userQuery ?? ""}」在 Wikidata 上为 ${identity.rank} 级单元（${identity.scientificName}）。scientificName 应填该等级学名或该类群下代表种；taxon 从锚定链展开，不要换成无关物种。`,
      };
    }
  }

  return null;
}

const FICTIONAL_DENIAL_RE =
  /虚构|神话(?:中的)?生物|不存在于现实|并非真实(?:存在)?的?(?:动物|生物)|不是真实(?:存在)?的?(?:动物|生物)|没有这种动物|仅为(?:传说|神话)|游戏(?:或|、)动漫|宝可梦|数码宝贝|口袋妖怪/i;

/**
 * 百科/别名已确认真实物种，但模型误判为虚构时触发重试。
 */
export function detectFictionalSpeciesDenial(
  payload: ExploreSpeciesPayload,
  anchor: SpeciesWikiAnchor | null,
): AnchorContentMismatch | null {
  if (!anchorHasVerifiedIdentity(anchor)) return null;

  const blob = [payload.summary, payload.bodyMarkdown, payload.scientificName, payload.taxon].join(
    "\n",
  );
  if (!FICTIONAL_DENIAL_RE.test(blob)) return null;

  const hint =
    anchor?.identityNote ??
    anchor?.scientificNameHint ??
    anchor?.zhTitle ??
    anchor?.userQuery ??
    "已锚定物种";

  return {
    reason: "模型将已锚定的真实物种误判为虚构生物。",
    retryHint: `上次输出称「${anchor?.userQuery ?? ""}」为虚构/神话/不存在的生物，这与系统已确认的真实物种身份矛盾。\n【系统已确认】${hint}\n请按真实昆虫/动物撰写完整图鉴 JSON；name 用规范中文种名${anchor?.canonicalDisplayName ? `「${anchor.canonicalDisplayName}」` : ""}；禁止写「虚构」「神话」「不存在于现实」。`,
  };
}
