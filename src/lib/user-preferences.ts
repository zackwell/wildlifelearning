import type { FieldGuideSortMode } from "@/lib/field-guide-list-sort";

export type ColorScheme = "system" | "light" | "dark";

export type UserPreferences = {
  fieldGuideSortMode: FieldGuideSortMode;
  fieldGuideStarredOnlyDefault: boolean;
  literatureDefaultEnabledForAsk: boolean;
  skipTopicsGuideAuto: boolean;
  skipLiteratureRagConfirm: boolean;
  skipLiteratureRemoveConfirm: boolean;
  colorScheme: ColorScheme;
};

const STORAGE_KEY = "wl-user-preferences-v1";

const LEGACY_KEYS = {
  fieldGuideSort: "wl-field-guide-sort-v1",
  skipTopicsGuide: "wl-topics-guide-skip-auto",
  skipLiteratureRag: "wl-literature-rag-skip-confirm",
  skipLiteratureRemove: "wl-literature-remove-skip-confirm",
} as const;

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  fieldGuideSortMode: "savedAt",
  fieldGuideStarredOnlyDefault: false,
  literatureDefaultEnabledForAsk: true,
  skipTopicsGuideAuto: false,
  skipLiteratureRagConfirm: false,
  skipLiteratureRemoveConfirm: false,
  colorScheme: "system",
};

function isFieldGuideSortMode(v: unknown): v is FieldGuideSortMode {
  return v === "savedAt" || v === "scientificName" || v === "name";
}

function isColorScheme(v: unknown): v is ColorScheme {
  return v === "system" || v === "light" || v === "dark";
}

function readLegacyPartial(): Partial<UserPreferences> {
  if (typeof window === "undefined") return {};
  const partial: Partial<UserPreferences> = {};

  const sort = window.localStorage.getItem(LEGACY_KEYS.fieldGuideSort);
  if (isFieldGuideSortMode(sort)) partial.fieldGuideSortMode = sort;

  if (window.localStorage.getItem(LEGACY_KEYS.skipTopicsGuide) === "1") {
    partial.skipTopicsGuideAuto = true;
  }
  if (window.localStorage.getItem(LEGACY_KEYS.skipLiteratureRag) === "1") {
    partial.skipLiteratureRagConfirm = true;
  }
  if (window.localStorage.getItem(LEGACY_KEYS.skipLiteratureRemove) === "1") {
    partial.skipLiteratureRemoveConfirm = true;
  }

  return partial;
}

function syncLegacyKeys(prefs: UserPreferences): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(LEGACY_KEYS.fieldGuideSort, prefs.fieldGuideSortMode);

  const setFlag = (key: string, on: boolean) => {
    if (on) window.localStorage.setItem(key, "1");
    else window.localStorage.removeItem(key);
  };

  setFlag(LEGACY_KEYS.skipTopicsGuide, prefs.skipTopicsGuideAuto);
  setFlag(LEGACY_KEYS.skipLiteratureRag, prefs.skipLiteratureRagConfirm);
  setFlag(LEGACY_KEYS.skipLiteratureRemove, prefs.skipLiteratureRemoveConfirm);
}

function parseStored(raw: string | null): UserPreferences {
  const base = { ...DEFAULT_USER_PREFERENCES };
  if (!raw) return { ...base, ...readLegacyPartial() };

  try {
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    const merged: UserPreferences = {
      ...base,
      ...readLegacyPartial(),
      ...parsed,
    };

    if (!isFieldGuideSortMode(merged.fieldGuideSortMode)) {
      merged.fieldGuideSortMode = DEFAULT_USER_PREFERENCES.fieldGuideSortMode;
    }
    if (!isColorScheme(merged.colorScheme)) {
      merged.colorScheme = DEFAULT_USER_PREFERENCES.colorScheme;
    }

    return merged;
  } catch {
    return { ...base, ...readLegacyPartial() };
  }
}

export function loadUserPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_USER_PREFERENCES;
  return parseStored(window.localStorage.getItem(STORAGE_KEY));
}

export function saveUserPreferences(patch: Partial<UserPreferences>): UserPreferences {
  const next = { ...loadUserPreferences(), ...patch };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    syncLegacyKeys(next);
    applyColorScheme(next.colorScheme);
    window.dispatchEvent(new CustomEvent("wl-preferences-changed", { detail: next }));
  }
  return next;
}

export function resetUserPreferences(): UserPreferences {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
    Object.values(LEGACY_KEYS).forEach((key) => window.localStorage.removeItem(key));
    applyColorScheme(DEFAULT_USER_PREFERENCES.colorScheme);
    window.dispatchEvent(
      new CustomEvent("wl-preferences-changed", { detail: DEFAULT_USER_PREFERENCES }),
    );
  }
  return DEFAULT_USER_PREFERENCES;
}

export function applyColorScheme(scheme: ColorScheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("dark");

  if (scheme === "dark") {
    root.classList.add("dark");
    return;
  }
  if (scheme === "light") return;

  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.classList.add("dark");
  }
}

export const COLOR_SCHEME_OPTIONS: { value: ColorScheme; label: string; desc: string }[] = [
  { value: "system", label: "跟随系统", desc: "根据设备浅色 / 深色模式自动切换" },
  { value: "light", label: "浅色", desc: "始终使用浅色界面" },
  { value: "dark", label: "深色", desc: "始终使用深色界面" },
];
