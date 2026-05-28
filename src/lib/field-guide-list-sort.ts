import type { FieldGuideSavedEntry } from "@/lib/personal-field-guide";
import { loadUserPreferences, saveUserPreferences } from "@/lib/user-preferences";

export type FieldGuideSortMode = "savedAt" | "scientificName" | "name";

export const FIELD_GUIDE_SORT_OPTIONS: { value: FieldGuideSortMode; label: string }[] = [
  { value: "savedAt", label: "加入时间" },
  { value: "scientificName", label: "拉丁学名" },
  { value: "name", label: "中文名" },
];

export function loadFieldGuideSortMode(): FieldGuideSortMode {
  return loadUserPreferences().fieldGuideSortMode;
}

export function saveFieldGuideSortMode(mode: FieldGuideSortMode): void {
  saveUserPreferences({ fieldGuideSortMode: mode });
}

export function sortFieldGuideEntries(
  entries: FieldGuideSavedEntry[],
  mode: FieldGuideSortMode,
): FieldGuideSavedEntry[] {
  const list = [...entries];
  list.sort((a, b) => {
    if (mode === "savedAt") {
      return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
    }
    if (mode === "scientificName") {
      return a.species.scientificName.localeCompare(b.species.scientificName, "en", {
        sensitivity: "base",
      });
    }
    return a.species.name.localeCompare(b.species.name, "zh-CN");
  });
  return list;
}

/** 图鉴列表内搜索：中文名、学名、slug、分类、摘要 */
export function filterFieldGuideEntriesByQuery(
  entries: FieldGuideSavedEntry[],
  query: string,
): FieldGuideSavedEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (!tokens.length) return entries;

  return entries.filter((e) => {
    const s = e.species;
    const haystack = [s.name, s.scientificName, s.slug, s.taxon, s.summary]
      .filter(Boolean)
      .join("\n")
      .toLowerCase();
    return tokens.every((tok) => haystack.includes(tok));
  });
}
