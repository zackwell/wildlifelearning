import { resolveSpeciesNameAlias, type SpeciesNameAlias } from "@/lib/species-name-aliases";
import { isBaiduDisambiguationQuery } from "@/lib/species-baidu-baike";
import { resolveSpeciesWikiAnchor, type SpeciesWikiAnchor } from "@/lib/species-wiki-anchor";

export type SpeciesNameSuggestion = {
  suggestedQuery: string;
  reason: string;
  scientificNameHint?: string;
};

/** 常见字序/误写 → 正确物种名（键为用户可能输入的错误形） */
const CURATED_CORRECTIONS: Record<string, { suggested: string; reason: string }> = {
  牛羚: {
    suggested: "羚牛",
    reason:
      "「牛羚」多为「羚牛」（扭角羚，Budorcas taxicolor）的字序误写；百度百科「牛羚」是多义词页面，无法锚定具体动物。",
  },
};

/** 锚定是否足够可信，可安全进入图鉴生成 */
export function hasReliableSpeciesAnchor(
  anchor: SpeciesWikiAnchor | null,
  alias: SpeciesNameAlias | null,
): boolean {
  if (alias) return true;
  if (!anchor) return false;
  if (anchor.scientificNameHint?.trim()) return true;
  if (
    anchor.zhTitle &&
    anchor.matchQuality !== "none" &&
    (anchor.zhExtract?.length ?? 0) > 40
  ) {
    return true;
  }
  if (
    anchor.contentSource === "baidu" &&
    anchor.referenceBody &&
    anchor.referenceBody.length >= 400
  ) {
    return true;
  }
  return false;
}

function reverseTwoHanChars(query: string): string | null {
  const chars = [...query.trim()];
  if (chars.length !== 2) return null;
  if (!chars.every((c) => /\p{Script=Han}/u.test(c))) return null;
  return chars[1]! + chars[0]!;
}

async function verifiedSuggestion(
  suggested: string,
  reason: string,
): Promise<SpeciesNameSuggestion | null> {
  const suggestedQuery = suggested.trim();
  if (!suggestedQuery) return null;
  const anchor = await resolveSpeciesWikiAnchor(suggestedQuery);
  const alias = resolveSpeciesNameAlias(suggestedQuery);
  if (!hasReliableSpeciesAnchor(anchor, alias)) return null;
  return {
    suggestedQuery,
    reason,
    scientificNameHint: alias?.scientificNameHint ?? anchor?.scientificNameHint ?? undefined,
  };
}

/**
 * 当用户输入无法可靠锚定到物种时，给出名称纠正建议（如 牛羚 → 羚牛）。
 */
export async function resolveSpeciesNameSuggestion(
  query: string,
  anchor: SpeciesWikiAnchor | null,
  alias: SpeciesNameAlias | null,
): Promise<SpeciesNameSuggestion | null> {
  const q = query.trim();
  if (!q || hasReliableSpeciesAnchor(anchor, alias)) return null;

  const curated = CURATED_CORRECTIONS[q];
  if (curated) {
    const hit = await verifiedSuggestion(curated.suggested, curated.reason);
    if (hit) return hit;
  }

  const reversed = reverseTwoHanChars(q);
  if (reversed && reversed !== q && !CURATED_CORRECTIONS[q]) {
    const hit = await verifiedSuggestion(
      reversed,
      `「${q}」未能匹配到可靠百科条目；您是否想查询「${reversed}」？`,
    );
    if (hit) return hit;
  }

  const baiduDisambig = await isBaiduDisambiguationQuery(q);
  if (baiduDisambig && reversed && reversed !== q) {
    const hit = await verifiedSuggestion(
      reversed,
      `「${q}」在百度百科为多义词页面；常见误写为「${reversed}」，是否改用后者？`,
    );
    if (hit) return hit;
  }

  return null;
}
