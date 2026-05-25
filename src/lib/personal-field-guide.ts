import type { ExploreSpeciesPayload } from "@/lib/explore-species";
import { findFieldGuideEntryInList } from "@/lib/field-guide-match";
import { fieldGuideAllSlides, fieldGuideCoverImage } from "@/lib/species-image-slides";

const STORAGE_KEY = "wl-personal-field-guide-v1";
const MAX_ENTRIES = 40;
const MAX_USER_IMAGES = 12;

export type FieldGuideSavedEntry = {
  id: string;
  savedAt: string;
  species: ExploreSpeciesPayload;
  /** 星标收藏 */
  starred?: boolean;
};

function safeParse(raw: string | null): FieldGuideSavedEntry[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((item): item is FieldGuideSavedEntry => isValidEntry(item));
  } catch {
    return [];
  }
}

function isValidEntry(x: unknown): x is FieldGuideSavedEntry {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    o.id.length > 0 &&
    typeof o.savedAt === "string" &&
    typeof o.species === "object" &&
    o.species !== null
  );
}

function persistLocal(entries: FieldGuideSavedEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    throw new Error("本机存储空间不足，请删除部分上传图片或旧图鉴条目后重试。");
  }
}

function loadLocalEntries(): FieldGuideSavedEntry[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY)).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
}

export function normalizeSpeciesImages(species: ExploreSpeciesPayload): ExploreSpeciesPayload {
  const apiUrls =
    species.imageUrls
      ?.filter((u) => typeof u === "string" && u.trim().length > 0)
      .map((u) => u.trim()) ?? [];
  const firstApi =
    typeof species.imageUrl === "string" && species.imageUrl.trim()
      ? species.imageUrl.trim()
      : apiUrls[0];
  const userUploaded =
    species.userUploadedImages
      ?.filter((u) => typeof u === "string" && u.trim().length > 0)
      .map((u) => u.trim()) ?? [];
  const merged: ExploreSpeciesPayload = {
    ...species,
    imageUrls: apiUrls.length > 0 ? apiUrls : firstApi ? [firstApi] : undefined,
    imageUrl: firstApi ?? null,
    userUploadedImages: userUploaded.length > 0 ? userUploaded : undefined,
  };
  const cover = fieldGuideCoverImage(merged);
  return {
    ...merged,
    coverImageUrl: cover,
    imageUrl: cover,
  };
}

async function cloudFetch<T>(url: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(url, { ...init, credentials: "same-origin" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("request failed");
  return (await res.json()) as T;
}

export async function loadFieldGuideEntries(): Promise<FieldGuideSavedEntry[]> {
  try {
    const data = await cloudFetch<{ entries: FieldGuideSavedEntry[] }>("/api/user/field-guides");
    if (data) return data.entries;
  } catch {
    /* fallback */
  }
  return loadLocalEntries();
}

export async function getFieldGuideEntry(id: string): Promise<FieldGuideSavedEntry | null> {
  try {
    const data = await cloudFetch<{ entry: FieldGuideSavedEntry }>(`/api/user/field-guides/${id}`);
    if (data) return data.entry;
  } catch {
    /* fallback */
  }
  return loadLocalEntries().find((e) => e.id === id) ?? null;
}

export async function findFieldGuideEntryForSpecies(
  species: ExploreSpeciesPayload,
): Promise<FieldGuideSavedEntry | null> {
  const entries = await loadFieldGuideEntries();
  return findFieldGuideEntryInList(entries, species);
}

export async function saveFieldGuideEntry(species: ExploreSpeciesPayload): Promise<FieldGuideSavedEntry> {
  const normalized = normalizeSpeciesImages(species);
  const existing = await findFieldGuideEntryForSpecies(normalized);
  if (existing) return existing;
  try {
    const data = await cloudFetch<{ entry: FieldGuideSavedEntry }>("/api/user/field-guides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ species: normalized }),
    });
    if (data) return data.entry;
  } catch {
    /* fallback */
  }

  const entry: FieldGuideSavedEntry = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `fg-${Date.now()}`,
    savedAt: new Date().toISOString(),
    starred: false,
    species: normalized,
  };
  if (typeof window === "undefined") return entry;
  const prev = loadLocalEntries();
  persistLocal([entry, ...prev].slice(0, MAX_ENTRIES));
  return entry;
}

async function patchEntryCloud(
  id: string,
  species: ExploreSpeciesPayload,
): Promise<FieldGuideSavedEntry | null> {
  const data = await cloudFetch<{ entry: FieldGuideSavedEntry }>(`/api/user/field-guides/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ species: normalizeSpeciesImages(species) }),
  });
  return data?.entry ?? null;
}

function patchEntryLocal(
  id: string,
  patch: (species: ExploreSpeciesPayload) => ExploreSpeciesPayload,
): FieldGuideSavedEntry | null {
  if (typeof window === "undefined") return null;
  const prev = loadLocalEntries();
  let updated: FieldGuideSavedEntry | null = null;
  const next = prev.map((e) => {
    if (e.id !== id) return e;
    updated = {
      ...e,
      species: normalizeSpeciesImages(patch(e.species)),
    };
    return updated;
  });
  if (!updated) return null;
  persistLocal(next);
  return updated;
}

async function patchEntry(
  id: string,
  patch: (species: ExploreSpeciesPayload) => ExploreSpeciesPayload,
): Promise<FieldGuideSavedEntry | null> {
  const current = await getFieldGuideEntry(id);
  if (!current) return null;
  const patched = patch(current.species);
  try {
    const cloud = await patchEntryCloud(id, patched);
    if (cloud) return cloud;
  } catch {
    /* local fallback */
  }
  return patchEntryLocal(id, () => patched);
}

export async function updateFieldGuideEntrySpecies(
  id: string,
  species: ExploreSpeciesPayload,
): Promise<FieldGuideSavedEntry | null> {
  return patchEntry(id, () => species);
}

export async function updateFieldGuideSpeciesImages(id: string, imageUrls: string[]): Promise<void> {
  await patchEntry(id, (s) => {
    const trimmed = imageUrls.map((u) => u.trim()).filter((u) => u.length > 0);
    return {
      ...s,
      imageUrls: trimmed.length > 0 ? trimmed : undefined,
      imageUrl: trimmed[0] ?? null,
    };
  });
}

export async function addFieldGuideUserImage(id: string, dataUrl: string): Promise<FieldGuideSavedEntry | null> {
  const url = dataUrl.trim();
  if (!url) return null;
  return patchEntry(id, (s) => {
    const prev = s.userUploadedImages ?? [];
    if (prev.includes(url)) return s;
    if (prev.length >= MAX_USER_IMAGES) {
      throw new Error(`最多上传 ${MAX_USER_IMAGES} 张本机配图。`);
    }
    const userUploadedImages = [...prev, url];
    const all = fieldGuideAllSlides({ ...s, userUploadedImages });
    const coverImageUrl = s.coverImageUrl?.trim() || all[0] || url;
    return { ...s, userUploadedImages, coverImageUrl };
  });
}

export async function removeFieldGuideImage(id: string, url: string): Promise<FieldGuideSavedEntry | null> {
  const target = url.trim();
  return patchEntry(id, (s) => {
    const api = (s.imageUrls ?? []).filter((u) => u !== target);
    const user = (s.userUploadedImages ?? []).filter((u) => u !== target);
    let coverImageUrl = s.coverImageUrl?.trim() ?? null;
    if (coverImageUrl === target) coverImageUrl = null;
    return {
      ...s,
      imageUrls: api.length > 0 ? api : undefined,
      userUploadedImages: user.length > 0 ? user : undefined,
      coverImageUrl,
    };
  });
}

export async function setFieldGuideCoverImage(id: string, url: string): Promise<FieldGuideSavedEntry | null> {
  const cover = url.trim();
  return patchEntry(id, (s) => {
    const all = fieldGuideAllSlides(s);
    if (!all.includes(cover)) {
      throw new Error("只能将已有配图设为封面。");
    }
    return { ...s, coverImageUrl: cover };
  });
}

export async function toggleFieldGuideStarred(id: string, starred: boolean): Promise<FieldGuideSavedEntry | null> {
  try {
    const data = await cloudFetch<{ entry: FieldGuideSavedEntry }>(`/api/user/field-guides/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starred }),
    });
    if (data?.entry) return data.entry;
  } catch {
    /* local fallback */
  }
  if (typeof window === "undefined") return null;
  const prev = loadLocalEntries();
  let updated: FieldGuideSavedEntry | null = null;
  const next = prev.map((e) => {
    if (e.id !== id) return e;
    updated = { ...e, starred };
    return updated;
  });
  if (!updated) return null;
  persistLocal(next);
  return updated;
}

export async function removeFieldGuideEntry(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/user/field-guides/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (res.ok) return;
    if (res.status !== 401) return;
  } catch {
    /* local */
  }
  if (typeof window === "undefined") return;
  persistLocal(loadLocalEntries().filter((e) => e.id !== id));
}

export function readLocalFieldGuideEntriesForMigration(): FieldGuideSavedEntry[] {
  return loadLocalEntries();
}

export { fieldGuideCoverImage, fieldGuideAllSlides };
