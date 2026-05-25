import type { ExploreSpeciesPayload } from "@/lib/explore-species";
import type { FieldGuideSavedEntry } from "@/lib/personal-field-guide";
import type { QuestionBankSet } from "@/lib/question-bank";
import type { LiteratureMeta } from "@/lib/rag/types";
import { useSyncExternalStore } from "react";

/** 探索动物页：跨路由保留预览草稿（同一会话 Tab 内） */
export type ExploreDraftSnapshot = {
  q: string;
  data: ExploreSpeciesPayload | null;
  galleryEditedUrls: string[] | null;
  saveHint: string | null;
};

export type ExplorePreviewSnapshot = Pick<
  ExploreDraftSnapshot,
  "data" | "galleryEditedUrls" | "saveHint"
> & {
  /** 当前预览物种已保存的图鉴条目 id（防重复点击） */
  savedEntryId: string | null;
};

export type AskDraftSnapshot = {
  fieldGuideKey: string;
  question: string;
  /** 提交时按图鉴物种补全后的问题（供展示与并入图鉴） */
  resolvedQuestion: string;
  /** 已匹配图鉴物种中文名 */
  speciesName: string;
  result: {
    answer: string;
    citations: Array<{
      id: string;
      excerpt: string;
      sourceTitle: string;
      sourcePath: string;
    }>;
    mode: string;
  } | null;
};

export type AskInputSnapshot = Pick<AskDraftSnapshot, "fieldGuideKey" | "question">;

export type LiteratureDocSnapshot = {
  title: string;
  fileName: string;
  body: string;
  uploadedAt: string;
};

function createStore<T extends object>(initial: T) {
  const state = { ...initial };
  let snapshot: T = { ...initial };
  const listeners = new Set<() => void>();

  return {
    get: (): T => snapshot,
    patch: (patch: Partial<T>): void => {
      Object.assign(state, patch);
      snapshot = { ...state } as T;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function createValueStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    get: (): T => state,
    set: (next: T): void => {
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const exploreQueryStore = createStore({ q: "" });
const explorePreviewStore = createStore<ExplorePreviewSnapshot>({
  data: null,
  galleryEditedUrls: null,
  saveHint: null,
  savedEntryId: null,
});

const askInputStore = createStore<AskInputSnapshot>({
  fieldGuideKey: "",
  question: "",
});
const askMetaStore = createStore<Pick<AskDraftSnapshot, "resolvedQuestion" | "speciesName">>({
  resolvedQuestion: "",
  speciesName: "",
});
const askResultStore = createStore<Pick<AskDraftSnapshot, "result">>({ result: null });

const fieldGuideListStore = createValueStore<FieldGuideSavedEntry[] | null>(null);
const questionBankSetsStore = createValueStore<QuestionBankSet[] | null>(null);
const questionBankOpenIdStore = createValueStore<string | null>(null);
const literatureCatalogStore = createValueStore<LiteratureMeta[] | null>(null);
const literatureDocStores = new Map<string, ReturnType<typeof createStore<LiteratureDocSnapshot>>>();
const literatureDocListeners = new Set<() => void>();

function getLiteratureDocStore(id: string) {
  let store = literatureDocStores.get(id);
  if (!store) {
    store = createStore<LiteratureDocSnapshot>({
      title: "",
      fileName: "",
      body: "",
      uploadedAt: "",
    });
    literatureDocStores.set(id, store);
  }
  return store;
}

function emitLiteratureDocListeners() {
  literatureDocListeners.forEach((listener) => listener());
}

function subscribeLiteratureDocs(listener: () => void) {
  literatureDocListeners.add(listener);
  return () => literatureDocListeners.delete(listener);
}

export function getExploreDraft(): ExploreDraftSnapshot {
  return { ...exploreQueryStore.get(), ...explorePreviewStore.get() };
}

export function patchExploreQuery(patch: Partial<Pick<ExploreDraftSnapshot, "q">>): void {
  exploreQueryStore.patch(patch);
}

export function patchExplorePreview(patch: Partial<ExplorePreviewSnapshot>): void {
  explorePreviewStore.patch(patch);
}

export function patchExploreDraft(patch: Partial<ExploreDraftSnapshot>): void {
  const { q, data, galleryEditedUrls, saveHint } = patch;
  if (q !== undefined) exploreQueryStore.patch({ q });
  const previewPatch: Partial<ExplorePreviewSnapshot> = {};
  if (data !== undefined) previewPatch.data = data;
  if (galleryEditedUrls !== undefined) previewPatch.galleryEditedUrls = galleryEditedUrls;
  if (saveHint !== undefined) previewPatch.saveHint = saveHint;
  if (Object.keys(previewPatch).length > 0) {
    explorePreviewStore.patch(previewPatch);
  }
}

export function useExploreQuery(): string {
  return useSyncExternalStore(
    exploreQueryStore.subscribe,
    () => exploreQueryStore.get().q,
    () => exploreQueryStore.get().q,
  );
}

export function useExplorePreview(): ExplorePreviewSnapshot {
  return useSyncExternalStore(
    explorePreviewStore.subscribe,
    explorePreviewStore.get,
    explorePreviewStore.get,
  );
}

/** @deprecated Prefer useExploreQuery + useExplorePreview for inputs that should not re-render previews. */
export function useExploreDraft(): ExploreDraftSnapshot {
  return useSyncExternalStore(
    (listener) => {
      const unsubQuery = exploreQueryStore.subscribe(listener);
      const unsubPreview = explorePreviewStore.subscribe(listener);
      return () => {
        unsubQuery();
        unsubPreview();
      };
    },
    getExploreDraft,
    getExploreDraft,
  );
}

export function getAskDraft(): AskDraftSnapshot {
  return { ...askInputStore.get(), ...askMetaStore.get(), ...askResultStore.get() };
}

export function patchAskInput(patch: Partial<AskInputSnapshot>): void {
  askInputStore.patch(patch);
}

export function patchAskResult(patch: Partial<Pick<AskDraftSnapshot, "result">>): void {
  askResultStore.patch(patch);
}

export function patchAskDraft(patch: Partial<AskDraftSnapshot>): void {
  const { fieldGuideKey, question, resolvedQuestion, speciesName, result } = patch;
  if (fieldGuideKey !== undefined || question !== undefined) {
    askInputStore.patch({
      ...(fieldGuideKey !== undefined ? { fieldGuideKey } : {}),
      ...(question !== undefined ? { question } : {}),
    });
  }
  if (resolvedQuestion !== undefined || speciesName !== undefined) {
    askMetaStore.patch({
      ...(resolvedQuestion !== undefined ? { resolvedQuestion } : {}),
      ...(speciesName !== undefined ? { speciesName } : {}),
    });
  }
  if (result !== undefined) askResultStore.patch({ result });
}

export function useAskInput(): AskInputSnapshot {
  return useSyncExternalStore(askInputStore.subscribe, askInputStore.get, askInputStore.get);
}

export function useAskResult(): AskDraftSnapshot["result"] {
  return useSyncExternalStore(
    askResultStore.subscribe,
    () => askResultStore.get().result,
    () => askResultStore.get().result,
  );
}

/** @deprecated Prefer useAskInput + useAskResult for text fields. */
export function useAskDraft(): AskDraftSnapshot {
  return useSyncExternalStore(
    (listener) => {
      const unsubInput = askInputStore.subscribe(listener);
      const unsubMeta = askMetaStore.subscribe(listener);
      const unsubResult = askResultStore.subscribe(listener);
      return () => {
        unsubInput();
        unsubMeta();
        unsubResult();
      };
    },
    getAskDraft,
    getAskDraft,
  );
}

export function getFieldGuideListCache(): FieldGuideSavedEntry[] | null {
  return fieldGuideListStore.get();
}

export function setFieldGuideListCache(entries: FieldGuideSavedEntry[]): void {
  fieldGuideListStore.set(entries);
}

export function prependFieldGuideListCache(entry: FieldGuideSavedEntry): void {
  const current = fieldGuideListStore.get();
  if (!current) {
    fieldGuideListStore.set([entry]);
  } else {
    fieldGuideListStore.set([entry, ...current.filter((e) => e.id !== entry.id)]);
  }
}

export function removeFieldGuideListCacheItem(id: string): void {
  const current = fieldGuideListStore.get();
  if (!current) return;
  fieldGuideListStore.set(current.filter((e) => e.id !== id));
}

export function updateFieldGuideListCacheItem(entry: FieldGuideSavedEntry): void {
  const current = fieldGuideListStore.get();
  if (!current) return;
  fieldGuideListStore.set(current.map((e) => (e.id === entry.id ? entry : e)));
}

export function useFieldGuideListCache(): FieldGuideSavedEntry[] | null {
  return useSyncExternalStore(
    fieldGuideListStore.subscribe,
    fieldGuideListStore.get,
    fieldGuideListStore.get,
  );
}

export function getQuestionBankListCache(): QuestionBankSet[] | null {
  return questionBankSetsStore.get();
}

export function setQuestionBankListCache(sets: QuestionBankSet[]): void {
  questionBankSetsStore.set(sets);
}

export function removeQuestionBankListCacheItem(id: string): void {
  const current = questionBankSetsStore.get();
  if (!current) return;
  questionBankSetsStore.set(current.filter((s) => s.id !== id));
}

export function getQuestionBankOpenId(): string | null {
  return questionBankOpenIdStore.get();
}

export function setQuestionBankOpenId(id: string | null): void {
  questionBankOpenIdStore.set(id);
}

export function useQuestionBankListCache(): QuestionBankSet[] | null {
  return useSyncExternalStore(
    questionBankSetsStore.subscribe,
    questionBankSetsStore.get,
    questionBankSetsStore.get,
  );
}

export function useQuestionBankOpenId(): string | null {
  return useSyncExternalStore(
    questionBankOpenIdStore.subscribe,
    questionBankOpenIdStore.get,
    questionBankOpenIdStore.get,
  );
}

export function getLiteratureCatalogCache(): LiteratureMeta[] | null {
  return literatureCatalogStore.get();
}

export function setLiteratureCatalogCache(list: LiteratureMeta[]): void {
  literatureCatalogStore.set(list);
}

export function removeLiteratureCatalogCacheItem(id: string): void {
  const current = literatureCatalogStore.get();
  if (!current) return;
  literatureCatalogStore.set(current.filter((item) => item.id !== id));
}

export function updateLiteratureCatalogCacheItem(item: LiteratureMeta): void {
  const current = literatureCatalogStore.get();
  if (!current) return;
  literatureCatalogStore.set(current.map((x) => (x.id === item.id ? item : x)));
}

export function useLiteratureCatalogCache(): LiteratureMeta[] | null {
  return useSyncExternalStore(
    literatureCatalogStore.subscribe,
    literatureCatalogStore.get,
    literatureCatalogStore.get,
  );
}

export function getLiteratureDocCache(id: string): LiteratureDocSnapshot | null {
  const store = literatureDocStores.get(id);
  if (!store) return null;
  const doc = store.get();
  return doc.body ? doc : null;
}

export function setLiteratureDocCache(id: string, doc: LiteratureDocSnapshot): void {
  getLiteratureDocStore(id).patch(doc);
  emitLiteratureDocListeners();
}

export function useLiteratureDocCache(id: string): LiteratureDocSnapshot | null {
  return useSyncExternalStore(
    (listener) => {
      const unsubDocs = subscribeLiteratureDocs(listener);
      const store = literatureDocStores.get(id);
      const unsubDoc = store ? store.subscribe(listener) : undefined;
      return () => {
        unsubDocs();
        unsubDoc?.();
      };
    },
    () => getLiteratureDocCache(id),
    () => getLiteratureDocCache(id),
  );
}
