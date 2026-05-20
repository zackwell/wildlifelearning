import type { FieldGuideSavedEntry } from "@/lib/personal-field-guide";

export type FieldGuideSortMode = "savedAt" | "scientificName" | "name";

export const FIELD_GUIDE_SORT_OPTIONS: { value: FieldGuideSortMode; label: string }[] = [
  { value: "savedAt", label: "加入时间" },
  { value: "scientificName", label: "拉丁学名" },
  { value: "name", label: "中文名" },
];

const SORT_STORAGE_KEY = "wl-field-guide-sort-v1";

export function loadFieldGuideSortMode(): FieldGuideSortMode {
  if (typeof window === "undefined") return "savedAt";
  const raw = window.localStorage.getItem(SORT_STORAGE_KEY);
  if (raw === "scientificName" || raw === "name" || raw === "savedAt") return raw;
  return "savedAt";
}

export function saveFieldGuideSortMode(mode: FieldGuideSortMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SORT_STORAGE_KEY, mode);
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
