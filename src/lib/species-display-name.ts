import type { ExploreSpeciesPayload } from "@/lib/explore-species";
import type { SpeciesNameAlias } from "@/lib/species-name-aliases";
import { extractChineseSpeciesNameFromTaxon } from "@/lib/species-taxon-normalize";
import type { SpeciesWikiAnchor } from "@/lib/species-wiki-anchor";

export type CanonicalSpeciesDisplay = {
  /** 图鉴展示用规范中文名 */
  canonicalName: string;
  /** 用户输入是否为别称/俗名 */
  userInputWasAlias: boolean;
};

export type CanonicalSpeciesNameHints = {
  taxon?: string;
  modelName?: string;
};

function containsCjk(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

function namesEquivalent(a: string, b: string): boolean {
  const left = a.trim();
  const right = b.trim();
  if (!left || !right) return left === right;
  if (left === right) return true;
  if (!containsCjk(left) && !containsCjk(right)) {
    return left.toLowerCase() === right.toLowerCase();
  }
  return false;
}

export function isUserInputAlias(userQuery: string, canonicalName: string): boolean {
  if (!userQuery.trim() || !canonicalName.trim()) return false;
  if (namesEquivalent(userQuery, canonicalName)) return false;
  if (!containsCjk(userQuery) && containsCjk(canonicalName)) return true;
  return userQuery.trim() !== canonicalName.trim();
}

function pickCanonical(
  userQuery: string,
  candidate: string | null | undefined,
): CanonicalSpeciesDisplay | null {
  const canonicalName = candidate?.trim();
  if (!canonicalName) return null;
  return {
    canonicalName,
    userInputWasAlias: isUserInputAlias(userQuery, canonicalName),
  };
}

/** 解析图鉴应展示的中文种名（规范名优先于用户别称/英文俗名）。 */
export function resolveCanonicalSpeciesDisplayName(
  userQuery: string,
  anchor: SpeciesWikiAnchor | null,
  alias: SpeciesNameAlias | null,
  hints?: CanonicalSpeciesNameHints,
): CanonicalSpeciesDisplay {
  const q = userQuery.trim();
  if (!q) return { canonicalName: "", userInputWasAlias: false };

  for (const candidate of [
    anchor?.canonicalDisplayName,
    alias?.canonicalZh,
    anchor?.contentSource === "baidu" ? anchor?.zhTitle : null,
    anchor?.zhTitle && containsCjk(anchor.zhTitle) ? anchor.zhTitle : null,
    hints?.taxon ? extractChineseSpeciesNameFromTaxon(hints.taxon) : null,
    hints?.modelName && containsCjk(hints.modelName) ? hints.modelName : null,
  ]) {
    const picked = pickCanonical(q, candidate);
    if (picked) return picked;
  }

  return { canonicalName: q, userInputWasAlias: false };
}

export function buildAliasNameNote(userQuery: string, canonicalName: string): string {
  const q = userQuery.trim();
  const canonical = canonicalName.trim();
  if (!q || !canonical || namesEquivalent(q, canonical)) return "";
  if (!containsCjk(q) && containsCjk(canonical)) {
    return `您搜索的「${q}」是「${canonical}」的英文俗名/别称。`;
  }
  return `您搜索的「${q}」是「${canonical}」的常用别称。`;
}

/**
 * 将图鉴 name 统一为规范种名；若用户输入为别称，在 summary 首段说明。
 */
export function applyCanonicalSpeciesDisplayName(
  payload: ExploreSpeciesPayload,
  userQuery: string,
  anchor: SpeciesWikiAnchor | null,
  alias: SpeciesNameAlias | null,
  opts?: { genericGroupOverview?: boolean },
): ExploreSpeciesPayload {
  const q = userQuery.trim();
  if (!q || opts?.genericGroupOverview) return payload;

  const { canonicalName, userInputWasAlias } = resolveCanonicalSpeciesDisplayName(
    q,
    anchor,
    alias,
    { taxon: payload.taxon, modelName: payload.name },
  );
  if (!canonicalName) return payload;

  let summary = payload.summary.trim();
  if (userInputWasAlias) {
    const note = buildAliasNameNote(q, canonicalName);
    if (note && !summary.includes(note) && !summary.startsWith("您搜索的「")) {
      summary = `${note}\n\n${summary}`;
    }
  }

  let scientificName = payload.scientificName;
  if (userInputWasAlias && anchor?.scientificNameHint?.trim()) {
    scientificName = anchor.scientificNameHint;
  }

  let reportSearchQuery = payload.reportSearchQuery;
  if (
    anchor?.scientificNameHint &&
    !reportSearchQuery.includes(anchor.scientificNameHint.split(" ")[0] ?? "")
  ) {
    reportSearchQuery = `${anchor.scientificNameHint} ${canonicalName}`.trim().slice(0, 280);
  }

  return {
    ...payload,
    name: canonicalName,
    summary,
    scientificName,
    reportSearchQuery,
  };
}

/** @deprecated 使用 applyCanonicalSpeciesDisplayName */
export function enforceUserQuerySpeciesName(
  payload: ExploreSpeciesPayload,
  userQuery: string,
  anchor: SpeciesWikiAnchor | null,
): ExploreSpeciesPayload {
  return applyCanonicalSpeciesDisplayName(payload, userQuery, anchor, null);
}
