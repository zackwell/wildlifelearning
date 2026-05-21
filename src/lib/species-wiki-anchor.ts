import {
  resolveSpeciesNameAlias,
  type SpeciesNameAlias,
} from "@/lib/species-name-aliases";
import { resolveBaiduBaikeSpecies, baiduReferenceIsRich } from "@/lib/species-baidu-baike";
import {
  formatTaxonIdentityForPrompt,
  resolveTaxonFromWikidata,
  type ResolvedTaxonIdentity,
} from "@/lib/species-wikidata-taxon";

const UA =
  "WildlifeLearning/1.0 (educational wildlife site; contact via project maintainer)";

const FETCH_MS = 6000;

export type SpeciesWikiAnchor = {
  userQuery: string;
  /** 锚定条目标题（百度百科或维基） */
  zhTitle: string | null;
  zhExtract: string | null;
  /** 从摘要/描述中抽出的拉丁学名提示 */
  scientificNameHint: string | null;
  /** 用户输入与检索条目的匹配质量 */
  matchQuality: "exact_title" | "search_hit" | "alias" | "none";
  /** 异名/台湾用字对应的现代常用名（如 鵎鵼 → 巨嘴鸟） */
  modernZhName: string | null;
  /** 给模型的物种身份说明（含异名关系） */
  identityNote: string | null;
  /** Wikidata 结构化分类身份（仅维基回退且可达时） */
  resolvedTaxon: ResolvedTaxonIdentity | null;
  /** 英文维基摘要（维基回退时的补充） */
  enWikiExtract: string | null;
  /** 资料来源 */
  contentSource: "baidu" | "wiki" | "none";
  /** 百度百科等提供的英文俗名（如 Binturong） */
  englishCommonName: string | null;
  /** 目/科/属/种等简要分类（来自百科信息框） */
  taxonBrief: string | null;
  /** 百度百科等拉取的长参考正文（小节合并） */
  referenceBody: string | null;
};

function httpSignal(): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(FETCH_MS);
  }
  return undefined;
}

async function wikiGetJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
      signal: httpSignal(),
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

/** 直接查标题（含重定向） */
async function wikiResolveExactTitle(lang: "zh" | "en", title: string): Promise<string | null> {
  const t = title.trim();
  if (!t) return null;
  const api = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  api.searchParams.set("action", "query");
  api.searchParams.set("titles", t);
  api.searchParams.set("redirects", "1");
  api.searchParams.set("format", "json");
  const j = (await wikiGetJson(api.toString())) as {
    query?: { pages?: Record<string, { title?: string; missing?: string }> };
  } | null;
  const pages = j?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (!page || page.missing) return null;
  return typeof page.title === "string" ? page.title : null;
}

async function wikiSearchTitle(lang: "zh" | "en", q: string): Promise<string | null> {
  const trimmed = q.trim();
  if (!trimmed) return null;
  const api = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  api.searchParams.set("action", "query");
  api.searchParams.set("list", "search");
  api.searchParams.set("srsearch", trimmed);
  api.searchParams.set("srlimit", "5");
  api.searchParams.set("format", "json");
  const j = (await wikiGetJson(api.toString())) as {
    query?: { search?: Array<{ title?: string }> };
  } | null;
  const hits = j?.query?.search ?? [];
  const exact = hits.find((h) => h.title?.trim() === trimmed);
  if (exact?.title) return exact.title;
  return hits[0]?.title ?? null;
}

async function wikiPageSummary(
  lang: "zh" | "en",
  title: string,
): Promise<{ extract: string; description: string; wikibaseItem: string | null } | null> {
  const path = encodeURIComponent(title.replace(/ /g, "_"));
  try {
    const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${path}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
      signal: httpSignal(),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      extract?: string;
      description?: string;
      wikibase_item?: string;
    };
    const extract = typeof j.extract === "string" ? j.extract.trim() : "";
    const description = typeof j.description === "string" ? j.description.trim() : "";
    const wikibaseItem =
      typeof j.wikibase_item === "string" && /^Q\d+$/.test(j.wikibase_item)
        ? j.wikibase_item
        : null;
    if (!extract && !description) return null;
    return { extract, description, wikibaseItem };
  } catch {
    return null;
  }
}

/** 从维基摘要里粗提拉丁学名（种级双名、括号科/属名、英文 genus 句式） */
function extractLatinHint(text: string): string | null {
  const parenFamily =
    text.match(/[（(]([A-Z][a-z]+idae)[）)]/)?.[1] ??
    text.match(/[（(]([A-Z][a-z]+)[）)]/)?.[1];
  if (parenFamily && parenFamily.length >= 5 && parenFamily.length < 80) {
    return parenFamily.trim();
  }
  const binom =
    text.match(/([A-Z][a-z]+(?:\s+[a-z]+)(?:\s+subsp\.\s+[a-z]+)?)/)?.[1] ??
    text.match(/学名[：:]\s*([A-Z][a-z]+(?:\s+[a-z]+)?)/)?.[1];
  if (binom && binom.length >= 5 && binom.length < 80) return binom.trim();
  const genus =
    text.match(/\bgenus\s+([A-Z][a-z]+)\b/i)?.[1] ??
    text.match(/\bonly species in the genus\s+([A-Z][a-z]+)\b/i)?.[1];
  if (genus && genus.length >= 4) return genus.trim();
  return null;
}

/** 英文条目标题 + 摘要中的属名 → 种级学名提示（如 Binturong + Arctictis） */
function inferBinomialFromEnWiki(enTitle: string, text: string): string | null {
  const direct = extractLatinHint(text);
  if (direct?.includes(" ")) return direct;
  const genus =
    text.match(/\bgenus\s+([A-Z][a-z]+)\b/i)?.[1] ??
    text.match(/\bonly species in the genus\s+([A-Z][a-z]+)\b/i)?.[1] ??
    (direct && !direct.includes(" ") ? direct : null);
  if (!genus) return direct;
  const ep = enTitle.trim().toLowerCase();
  if (ep.length >= 3 && /^[a-z]+$/.test(ep)) {
    return `${genus} ${ep}`;
  }
  return genus;
}

async function resolveEnWikiTitleFromZh(zhTitle: string): Promise<string | null> {
  const api = new URL("https://zh.wikipedia.org/w/api.php");
  api.searchParams.set("action", "query");
  api.searchParams.set("titles", zhTitle);
  api.searchParams.set("prop", "langlinks");
  api.searchParams.set("lllang", "en");
  api.searchParams.set("format", "json");
  const j = (await wikiGetJson(api.toString())) as {
    query?: { pages?: Record<string, { langlinks?: Array<{ lang?: string; title?: string }> }> };
  } | null;
  const pages = j?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  const link = page?.langlinks?.find((l) => l.lang === "en" && l.title);
  return link?.title?.trim() ?? null;
}

function anchorSourceMode(): "baidu" | "wiki" | "baidu_first" {
  const v = (process.env.SPECIES_ANCHOR_SOURCE ?? "baidu").trim().toLowerCase();
  if (v === "wiki" || v === "baidu" || v === "baidu_first") return v;
  return "baidu";
}

function anchorFromBaidu(
  q: string,
  alias: SpeciesNameAlias | null,
  baidu: NonNullable<Awaited<ReturnType<typeof resolveBaiduBaikeSpecies>>>,
): SpeciesWikiAnchor {
  const noteParts: string[] = [];
  if (baidu.scientificName) noteParts.push(`标准学名：${baidu.scientificName}`);
  if (baidu.englishName) noteParts.push(`英文俗名：${baidu.englishName}`);
  if (baidu.taxonBrief) noteParts.push(`分类：${baidu.taxonBrief}`);

  return {
    userQuery: q,
    zhTitle: baidu.title,
    zhExtract: baidu.summary,
    scientificNameHint: alias?.scientificNameHint ?? baidu.scientificName,
    matchQuality: "exact_title",
    modernZhName: alias?.modernZh ?? null,
    identityNote:
      alias?.note ??
      (noteParts.length
        ? `系统已从百度百科确认「${q}」为真实物种。${noteParts.join("；")}。正文须按此物种撰写，name 仍填用户输入。`
        : null),
    resolvedTaxon: null,
    enWikiExtract: null,
    contentSource: "baidu",
    englishCommonName: baidu.englishName,
    taxonBrief: baidu.taxonBrief,
    referenceBody: baidu.referenceBody || null,
  };
}

async function resolveZhWikiTitle(title: string): Promise<string | null> {
  const exact = await wikiResolveExactTitle("zh", title);
  if (exact) return exact;
  return wikiSearchTitle("zh", title);
}

async function anchorFromZhTitle(
  q: string,
  zhTitle: string,
  matchQuality: SpeciesWikiAnchor["matchQuality"],
  alias: SpeciesNameAlias | null,
): Promise<SpeciesWikiAnchor> {
  const summary = await wikiPageSummary("zh", zhTitle);
  const hintText = [summary?.extract, summary?.description].filter(Boolean).join("\n");
  const fromWiki = hintText ? extractLatinHint(hintText) : null;

  let resolvedTaxon: ResolvedTaxonIdentity | null = null;
  if (summary?.wikibaseItem) {
    try {
      resolvedTaxon = await resolveTaxonFromWikidata(summary.wikibaseItem);
    } catch {
      resolvedTaxon = null;
    }
  }

  let enWikiExtract: string | null = null;
  let enScientificHint: string | null = null;
  let englishCommonName: string | null = null;
  if (!resolvedTaxon?.scientificName && !fromWiki) {
    const enTitle = await resolveEnWikiTitleFromZh(zhTitle);
    if (enTitle) {
      englishCommonName = enTitle;
      const enSummary = await wikiPageSummary("en", enTitle);
      if (enSummary?.extract) {
        enWikiExtract = enSummary.extract.slice(0, 600);
        const enText = [enSummary.extract, enSummary.description].filter(Boolean).join("\n");
        enScientificHint = inferBinomialFromEnWiki(enTitle, enText);
      }
    }
  }

  const scientificNameHint =
    alias?.scientificNameHint ??
    resolvedTaxon?.scientificName ??
    fromWiki ??
    enScientificHint;

  return {
    userQuery: q,
    zhTitle,
    zhExtract: summary?.extract?.slice(0, 600) ?? null,
    scientificNameHint,
    matchQuality,
    modernZhName: alias?.modernZh ?? null,
    identityNote: alias?.note ?? null,
    resolvedTaxon,
    enWikiExtract,
    contentSource: "wiki" as const,
    englishCommonName,
    taxonBrief: null,
    referenceBody: null,
  };
}

export async function resolveSpeciesWikiAnchor(userQuery: string): Promise<SpeciesWikiAnchor> {
  const q = userQuery.trim();
  const alias = resolveSpeciesNameAlias(q);
  const base: SpeciesWikiAnchor = {
    userQuery: q,
    zhTitle: null,
    zhExtract: null,
    scientificNameHint: alias?.scientificNameHint ?? null,
    matchQuality: "none",
    modernZhName: alias?.modernZh ?? null,
    identityNote: alias?.note ?? null,
    resolvedTaxon: null,
    enWikiExtract: null,
    contentSource: "none",
    englishCommonName: null,
    taxonBrief: null,
    referenceBody: null,
  };
  if (!q) return base;

  const mode = anchorSourceMode();

  if (mode === "baidu" || mode === "baidu_first") {
    try {
      const baidu = await resolveBaiduBaikeSpecies(q);
      if (baidu) return anchorFromBaidu(q, alias, baidu);
    } catch {
      /* fall through */
    }
    if (mode === "baidu") return base;
  }

  let zhTitle = await wikiResolveExactTitle("zh", q);
  let matchQuality: SpeciesWikiAnchor["matchQuality"] = zhTitle ? "exact_title" : "none";

  if (!zhTitle) {
    zhTitle = await wikiSearchTitle("zh", q);
    if (zhTitle) {
      matchQuality = zhTitle === q ? "exact_title" : "search_hit";
    }
  }

  if (!zhTitle && alias) {
    const titles = [alias.modernZh, ...alias.wikiTitles];
    const seen = new Set<string>();
    for (const t of titles) {
      const key = t.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const hit = await resolveZhWikiTitle(key);
      if (hit) {
        zhTitle = hit;
        matchQuality = "alias";
        break;
      }
    }
  }

  if (!zhTitle) return base;

  const wikiAnchor = await anchorFromZhTitle(q, zhTitle, matchQuality, alias);
  return wikiAnchor;
}

export function buildExploreSpeciesUserPrompt(
  query: string,
  anchor: SpeciesWikiAnchor,
  opts?: { genericGroupOverview?: boolean },
): string {
  const lines = [
    `【用户输入的动物名称】`,
    `「${query}」`,
    "",
    "要求：",
    "- JSON 字段 name 必须与用户输入完全一致（每个汉字、异体字均保留），不得改成其他字样。",
    "- 正文须写用户所指的那一种动物的全部科普内容，不得张冠李戴。",
    "- 禁止因不认识生僻字而擅自写成䴙䴘、小䴙䴘等与用户意图无关的物种。",
  ];

  if (opts?.genericGroupOverview) {
    lines.push(
      "",
      "【统称/类群介绍模式】",
      `用户选择查看「${query}」这一类动物的笼统介绍（非单一物种）。name 仍填「${query}」。`,
      "正文须涵盖该类群下常见物种的共性、分布格局、形态差异与识别要点，并比较主要种类；不要只写其中一种。",
      "summary 首句说明这是类群概览；scientificName 可填该类群代表属或科的学名。",
    );
  }

  if (anchor.identityNote) {
    lines.push("", "【物种身份（系统已解析，务必遵守）】", anchor.identityNote);
    if (anchor.modernZhName && anchor.modernZhName !== query) {
      lines.push(`现代常用名：${anchor.modernZhName}（正文按此物种撰写，name 仍用用户输入）。`);
    }
  }

  if (anchor.resolvedTaxon) {
    lines.push(
      "",
      "【系统已确认的分类身份（Wikidata，正文 scientificName / taxon 须与此一致，不得改用其它目科属）】",
      formatTaxonIdentityForPrompt(anchor.resolvedTaxon),
    );
    if (anchor.resolvedTaxon.rank === "family" || anchor.resolvedTaxon.rank === "genus") {
      lines.push(
        `说明：用户输入「${query}」对应 ${anchor.resolvedTaxon.rank === "family" ? "科" : "属"} 级分类单元。scientificName 填该 ${anchor.resolvedTaxon.rank === "family" ? "科" : "属"} 学名；taxon 沿上述分类链展开，可写该类群代表种或共性，但不得换成无关目/科。`,
      );
    }
  }

  if (anchor.zhTitle) {
    const sourceLabel =
      anchor.contentSource === "baidu" ? "百度百科" : "中文维基百科";
    lines.push(
      "",
      `【${sourceLabel}锚定参考】`,
      `条目：${anchor.zhTitle}`,
    );
    if (anchor.taxonBrief) {
      lines.push(`分类概要：${anchor.taxonBrief}`);
    }
    if (anchor.scientificNameHint) {
      lines.push(`学名提示：${anchor.scientificNameHint}`);
    }
    if (anchor.englishCommonName) {
      lines.push(`英文俗名：${anchor.englishCommonName}`);
    }
    if (anchor.zhExtract) {
      lines.push(`摘要：${anchor.zhExtract}`);
    }
    if (anchor.enWikiExtract) {
      lines.push(`英文维基摘要：${anchor.enWikiExtract}`);
    }
    if (anchor.scientificNameHint && anchor.zhTitle) {
      lines.push(
        `系统已从${sourceLabel}确认该物种存在且有可靠条目。scientificName 须填学名提示或等价双名，禁止填「未知」；不得整篇以「记载较少/无法确认分类」敷衍。`,
      );
    }
    if (anchor.contentSource === "baidu" && anchor.referenceBody && baiduReferenceIsRich(anchor.referenceBody)) {
      lines.push(
        "",
        "【百度百科正文参考（资料较充分，请据此写详实图鉴）】",
        "以下内容由系统从百度百科提取，请重组表述写入各 JSON 字段，事实须一致，勿与下列内容矛盾：",
        anchor.referenceBody,
        "",
        "写作要求（百科资料充分时）：",
        "- bodyMarkdown 至少 3 个 ## 小节（如识别要点、分布、生态、保护等），每节有实质段落",
        "- 将百科【形态特征】【鉴别特征】等内容重组写入 bodyStructureMarkdown",
        "- 将【生活习性】【食性】【繁殖方式】等内容写入 habitsMarkdown 与 diet 字段",
        "- 将【分布范围】【栖息环境】写入 habitat 与正文分布小节",
        "- 将【保护现状】【保护级别】写入 conservation",
        "- bodyStructureMarkdown / habitsMarkdown 各至少 2 个 ## 或 ### 小节",
        "- funFactsMarkdown 从百科中提取 2–4 条可靠冷知识",
        "- habitat / diet / conservation 写具体，不要仅写「记载较少」",
        "- taxon 须与学名提示及百科分类一致，写出纲/目/科/属/种五级",
      );
    }
    if (
      anchor.matchQuality === "search_hit" &&
      anchor.zhTitle !== query &&
      !anchor.identityNote
    ) {
      lines.push(
        `注意：维基检索首条为「${anchor.zhTitle}」。若与用户输入「${query}」并非同一物种，请在 summary 说明不确定性；若实为同一物种的异名/旧称，应写详实正文，不要写「记载较少」。`,
      );
    }
  } else if (!anchor.identityNote) {
    lines.push(
      "",
      "【百科未命中】未能从百度百科/维基拉取条目。请据可靠生物学知识作答；仅当确实无法确认该名称指何种动物时，summary 才说明无法核实，name 仍填用户原字。",
    );
  } else {
    lines.push(
      "",
      "【维基未拉取到正文】但物种身份已由系统解析（见上）。请按解析结果撰写详实图鉴，不要写「记载较少」。",
    );
  }

  lines.push("", "请输出图鉴 JSON。资料多写详，资料少如实写短一些，但各字段须有实质内容。");
  lines.push(
    "配图由系统另行检索，与正文无关；即使无配图也须写详实正文，勿因缺图写「记载较少」。",
  );
  return lines.join("\n");
}
