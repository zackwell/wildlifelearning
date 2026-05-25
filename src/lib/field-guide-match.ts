import type { ExploreSpeciesPayload } from "@/lib/explore-species";
import type { FieldGuideSavedEntry } from "@/lib/personal-field-guide";

export function slugifyFieldGuideKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeScientificName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** 判断两条图鉴是否指向同一物种（slug / 学名优先） */
export function fieldGuideSpeciesMatches(
  a: ExploreSpeciesPayload,
  b: ExploreSpeciesPayload,
): boolean {
  const slugA = a.slug?.trim();
  const slugB = b.slug?.trim();
  if (slugA && slugB) {
    if (slugA === slugB) return true;
    if (slugA.replace(/-/g, "") === slugB.replace(/-/g, "")) return true;
  }

  const sciA = normalizeScientificName(a.scientificName);
  const sciB = normalizeScientificName(b.scientificName);
  if (sciA.length >= 5 && sciB.length >= 5 && sciA === sciB) return true;

  return false;
}

export function findFieldGuideEntryInList(
  entries: FieldGuideSavedEntry[],
  species: ExploreSpeciesPayload,
): FieldGuideSavedEntry | null {
  return entries.find((e) => fieldGuideSpeciesMatches(e.species, species)) ?? null;
}

/** 按 slug / 中文名 / 学名片段在用户图鉴列表中查找 */
export function findFieldGuideEntryInListByKey(
  entries: FieldGuideSavedEntry[],
  key: string,
): FieldGuideSavedEntry | null {
  const raw = key.trim();
  if (!raw) return null;

  const slugKey = slugifyFieldGuideKey(raw);
  const lower = raw.toLowerCase();

  for (const e of entries) {
    const s = e.species;
    if (slugKey && s.slug === slugKey) return e;
    if (slugKey && s.slug.replace(/-/g, "") === slugKey.replace(/-/g, "")) return e;
    if (s.name.trim() === raw) return e;
    if (s.name.includes(raw) || raw.includes(s.name.trim())) return e;
    if (s.scientificName.toLowerCase().includes(lower)) return e;
    if (lower.includes(s.scientificName.toLowerCase())) return e;
  }
  return null;
}
