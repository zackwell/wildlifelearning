import { isLikelyScientificName } from "@/lib/species-image-search-context";

const UA =
  "WildlifeLearning/1.0 (educational wildlife site; contact via project maintainer)";

const FETCH_MS = 6000;

/** Wikidata「分类等级」项 → 内部 rank */
const WIKIDATA_RANK: Record<string, ResolvedTaxonRank> = {
  Q7432: "species",
  Q34740: "genus",
  Q35409: "family",
  Q37517: "order",
  Q37547: "class",
};

export type ResolvedTaxonRank =
  | "species"
  | "genus"
  | "family"
  | "order"
  | "class"
  | "other";

export type TaxonLineageNode = {
  rank: ResolvedTaxonRank;
  scientificName: string | null;
  labelZh: string | null;
  labelEn: string | null;
};

export type ResolvedTaxonIdentity = {
  wikibaseId: string;
  rank: ResolvedTaxonRank;
  scientificName: string | null;
  labelZh: string | null;
  labelEn: string | null;
  /** Wikidata P1843 英文俗名 */
  englishVernacularNames: string[];
  lineage: TaxonLineageNode[];
};

function httpSignal(): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(FETCH_MS);
  }
  return undefined;
}

type WbEntity = {
  labels?: Record<string, { value?: string }>;
  claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>;
};

function claimString(entity: WbEntity, prop: string): string | null {
  const snak = entity.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value;
  if (typeof snak === "string" && snak.trim()) return snak.trim();
  return null;
}

function claimEntityId(entity: WbEntity, prop: string): string | null {
  const v = entity.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value as
    | { id?: string }
    | undefined;
  return v?.id ?? null;
}

function labelOf(entity: WbEntity, lang: "zh" | "en"): string | null {
  const v = entity.labels?.[lang]?.value?.trim();
  return v || null;
}

function claimMonolingualTexts(entity: WbEntity, prop: string, lang: string): string[] {
  const claims = entity.claims?.[prop] ?? [];
  const out: string[] = [];
  for (const claim of claims) {
    const value = claim.mainsnak?.datavalue?.value as
      | { text?: string; language?: string }
      | undefined;
    const text = value?.text?.trim();
    if (value?.language === lang && text) out.push(text);
  }
  return out;
}

function normalizeScientificName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function englishVernacularNamesFromEntity(entity: WbEntity): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (value: string | null | undefined) => {
    const t = value?.trim();
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };

  for (const name of claimMonolingualTexts(entity, "P1843", "en")) {
    push(name);
  }

  const labelEn = labelOf(entity, "en");
  if (labelEn && !isLikelyScientificName(labelEn)) {
    push(labelEn);
  }

  return out;
}

async function fetchEntities(ids: string[]): Promise<Record<string, WbEntity>> {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 12);
  if (!unique.length) return {};
  const url = new URL("https://www.wikidata.org/w/api.php");
  url.searchParams.set("action", "wbgetentities");
  url.searchParams.set("ids", unique.join("|"));
  url.searchParams.set("props", "labels|claims");
  url.searchParams.set("languages", "zh");
  url.searchParams.append("languages", "en");
  url.searchParams.set("format", "json");
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
      signal: httpSignal(),
    });
    if (!res.ok) return {};
    const j = (await res.json()) as { entities?: Record<string, WbEntity> };
    return j.entities ?? {};
  } catch {
    return {};
  }
}

function rankFromEntity(entity: WbEntity): ResolvedTaxonRank {
  const rankId = claimEntityId(entity, "P105");
  if (rankId && WIKIDATA_RANK[rankId]) return WIKIDATA_RANK[rankId];
  return "other";
}

/**
 * 从 Wikidata 分类单元项解析结构化分类身份（纲→目→科→属→种链）。
 * 用于在正文生成前锁定物种/类群，避免模型凭汉字联想补全错误_taxon。
 */
export async function resolveTaxonFromWikidata(
  wikibaseId: string,
): Promise<ResolvedTaxonIdentity | null> {
  const id = wikibaseId.trim();
  if (!/^Q\d+$/.test(id)) return null;

  const entities = await fetchEntities([id]);
  const root = entities[id];
  if (!root) return null;

  const lineage: TaxonLineageNode[] = [];
  const seen = new Set<string>();
  let current: WbEntity | null = root;
  let currentId = id;

  for (let depth = 0; depth < 8 && current; depth++) {
    if (seen.has(currentId)) break;
    seen.add(currentId);

    lineage.push({
      rank: rankFromEntity(current),
      scientificName: claimString(current, "P225"),
      labelZh: labelOf(current, "zh"),
      labelEn: labelOf(current, "en"),
    });

    const parentId = claimEntityId(current, "P171");
    if (!parentId || seen.has(parentId)) break;
    if (!entities[parentId]) {
      const more = await fetchEntities([parentId]);
      Object.assign(entities, more);
    }
    current = entities[parentId] ?? null;
    currentId = parentId;
  }

  return {
    wikibaseId: id,
    rank: rankFromEntity(root),
    scientificName: claimString(root, "P225"),
    labelZh: labelOf(root, "zh"),
    labelEn: labelOf(root, "en"),
    englishVernacularNames: englishVernacularNamesFromEntity(root),
    lineage,
  };
}

/** 按学名在 Wikidata 检索英文俗名（P1843），用于搜图翻译校验。 */
export async function resolveEnglishVernacularNamesByScientificName(
  scientificName: string,
): Promise<string[]> {
  const sci = scientificName.trim();
  if (!sci || /^未知|unknown|n\/a/i.test(sci)) return [];

  const url = new URL("https://www.wikidata.org/w/api.php");
  url.searchParams.set("action", "wbsearchentities");
  url.searchParams.set("search", sci);
  url.searchParams.set("language", "en");
  url.searchParams.set("type", "item");
  url.searchParams.set("limit", "5");
  url.searchParams.set("format", "json");

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
      signal: httpSignal(),
    });
    if (!res.ok) return [];
    const j = (await res.json()) as {
      search?: Array<{ id?: string; label?: string }>;
    };
    const target = normalizeScientificName(sci);
    const ids = (j.search ?? [])
      .map((hit) => hit.id)
      .filter((id): id is string => typeof id === "string" && /^Q\d+$/.test(id));

    for (const id of ids.slice(0, 3)) {
      const entities = await fetchEntities([id]);
      const entity = entities[id];
      if (!entity) continue;
      const entitySci = claimString(entity, "P225");
      if (!entitySci || normalizeScientificName(entitySci) !== target) continue;
      return englishVernacularNamesFromEntity(entity);
    }
  } catch {
    return [];
  }

  return [];
}

/** 从 lineage 提取用于校验的关键拉丁类群名（科、目等） */
export function taxonLatinKeywords(identity: ResolvedTaxonIdentity): string[] {
  const out: string[] = [];
  for (const node of identity.lineage) {
    if (node.scientificName) out.push(node.scientificName.split(/\s+/)[0]!);
    if (node.labelEn) out.push(node.labelEn);
  }
  if (identity.scientificName) {
    out.push(identity.scientificName.split(/\s+/)[0]!);
    out.push(identity.scientificName);
  }
  return [...new Set(out.map((s) => s.trim()).filter((s) => s.length >= 4))];
}

export function formatTaxonIdentityForPrompt(identity: ResolvedTaxonIdentity): string {
  const chain = [...identity.lineage].reverse();
  const parts: string[] = [];
  for (const node of chain) {
    const zh = node.labelZh ?? "";
    const sci = node.scientificName ?? node.labelEn ?? "";
    if (!zh && !sci) continue;
    parts.push(`${zh}${sci ? `（${sci}）` : ""}`.trim());
  }
  const rankLabel: Record<ResolvedTaxonRank, string> = {
    species: "物种",
    genus: "属",
    family: "科",
    order: "目",
    class: "纲",
    other: "分类单元",
  };
  const lines = [
    `Wikidata：${identity.wikibaseId}`,
    `解析等级：${rankLabel[identity.rank]}`,
  ];
  if (identity.scientificName) lines.push(`标准学名：${identity.scientificName}`);
  if (identity.labelEn) lines.push(`英文常用名：${identity.labelEn}`);
  if (parts.length) lines.push(`分类链（由根到叶）：${parts.join(" → ")}`);
  return lines.join("\n");
}
