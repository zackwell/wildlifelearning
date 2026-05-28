import type { LiteratureMeta } from "@/lib/rag/types";
import { shouldUseCloudData } from "@/lib/guest-mode";
import { loadUserPreferences } from "@/lib/user-preferences";

const STORAGE_KEY = "wl-user-literature-v1";
const MAX_ENTRIES = 30;

function safeParse(raw: string | null): LiteratureMeta[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter(
      (x): x is LiteratureMeta =>
        !!x &&
        typeof x === "object" &&
        typeof (x as LiteratureMeta).id === "string" &&
        typeof (x as LiteratureMeta).title === "string",
    );
  } catch {
    return [];
  }
}

function persistLocal(list: LiteratureMeta[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function loadLocalCatalog(): LiteratureMeta[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY)).sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );
}

export async function loadLiteratureCatalog(): Promise<LiteratureMeta[]> {
  if (typeof window !== "undefined" && !shouldUseCloudData()) {
    return loadLocalCatalog();
  }
  try {
    const res = await fetch("/api/user/literature", { credentials: "same-origin" });
    if (res.status === 401) return loadLocalCatalog();
    if (!res.ok) throw new Error();
    const data = (await res.json()) as { list: LiteratureMeta[] };
    return data.list;
  } catch {
    return loadLocalCatalog();
  }
}

export async function addLiteratureMeta(meta: Omit<LiteratureMeta, "enabledForAsk">): Promise<LiteratureMeta> {
  const entry: LiteratureMeta = {
    ...meta,
    enabledForAsk: loadUserPreferences().literatureDefaultEnabledForAsk,
  };
  const prev = (await loadLiteratureCatalog()).filter((m) => m.id !== entry.id);
  persistLocal([entry, ...prev].slice(0, MAX_ENTRIES));
  return entry;
}

export async function removeLiteratureMeta(id: string): Promise<void> {
  persistLocal((await loadLiteratureCatalog()).filter((m) => m.id !== id));
}

export async function setLiteratureEnabledForAsk(id: string, enabled: boolean): Promise<void> {
  if (typeof window !== "undefined" && !shouldUseCloudData()) {
    persistLocal(
      loadLocalCatalog().map((m) => (m.id === id ? { ...m, enabledForAsk: enabled } : m)),
    );
    return;
  }
  try {
    const res = await fetch("/api/user/literature", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id, enabledForAsk: enabled }),
    });
    if (res.ok) return;
    if (res.status !== 401) return;
  } catch {
    /* local */
  }
  persistLocal(
    loadLocalCatalog().map((m) => (m.id === id ? { ...m, enabledForAsk: enabled } : m)),
  );
}

export async function enabledLiteratureIds(): Promise<string[]> {
  const list = await loadLiteratureCatalog();
  return list.filter((m) => m.enabledForAsk).map((m) => m.id);
}

export function readLocalLiteratureForMigration(): LiteratureMeta[] {
  return loadLocalCatalog();
}
