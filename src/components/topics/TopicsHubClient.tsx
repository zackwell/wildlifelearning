"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LiteratureMeta } from "@/lib/rag/types";
import {
  getLiteratureCatalogCache,
  removeLiteratureCatalogCacheItem,
  setLiteratureCatalogCache,
  useLiteratureCatalogCache,
} from "@/lib/client-session-cache";
import {
  loadLiteratureCatalog,
  removeLiteratureMeta,
  setLiteratureEnabledForAsk,
} from "@/lib/user-literature";

export function TopicsHubClient() {
  const listCache = useLiteratureCatalogCache();
  const [list, setList] = useState<LiteratureMeta[]>(() => getLiteratureCatalogCache() ?? []);
  const [ready, setReady] = useState(() => getLiteratureCatalogCache() !== null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    void loadLiteratureCatalog().then((catalog) => {
      setList(catalog);
      setLiteratureCatalogCache(catalog);
    });
  }, []);

  useEffect(() => {
    if (listCache) setList(listCache);
  }, [listCache]);

  useEffect(() => {
    setReady(true);
    refresh();
  }, [refresh]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setHint(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/literature/upload", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      const json = (await res.json()) as {
        id?: string;
        title?: string;
        fileName?: string;
        uploadedAt?: string;
        error?: string;
      };
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("上传文献请先登录账号。");
        }
        throw new Error(json.error ?? "上传失败");
      }

      refresh();
      setHint(`「${json.title}」已添加，可阅读或在智能助手中引用。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function onRemove(meta: LiteratureMeta) {
    if (!confirm(`确定移除「${meta.title}」？`)) return;
    setError(null);
    try {
      await fetch(`/api/literature/${meta.id}`, { method: "DELETE", credentials: "same-origin" });
    } catch {
      /* 仍更新本地列表 */
    }
    await removeLiteratureMeta(meta.id);
    removeLiteratureCatalogCacheItem(meta.id);
    refresh();
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-dashed border-emerald-800/25 bg-emerald-50/40 p-6 dark:border-emerald-200/15 dark:bg-emerald-950/25">
        <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">添加文献</h2>
        <p className="mt-2 max-w-xl text-sm text-emerald-900/85 dark:text-emerald-100/80">
          支持 .txt、.md、.pdf、.doc、.docx，在本页阅读；开启「智能助手引用」后，提问时会优先检索你上传的内容。
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,.markdown,.pdf,.doc,.docx,text/plain,text/markdown,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => void onFileChange(e)}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="mt-4 rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-600"
        >
          {uploading ? "正在处理…" : "选择文件上传"}
        </button>
        {hint ? <p className="mt-3 text-sm text-emerald-800 dark:text-emerald-200">{hint}</p> : null}
        {error ? (
          <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {!ready && list.length === 0 ? (
        <p className="text-sm text-emerald-800/80 dark:text-emerald-200/75">加载中…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-emerald-900/75 dark:text-emerald-100/75">
          还没有资料。上传文献后，可在此阅读并选择在智能助手中引用。
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-emerald-900/10 bg-white/80 p-4 dark:border-emerald-100/10 dark:bg-emerald-950/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-50">{item.title}</p>
                  <p className="mt-1 text-xs text-emerald-800/70 dark:text-emerald-200/65">
                    {item.fileName} · {new Date(item.uploadedAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/topics/read/${item.id}`}
                    className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-600"
                  >
                    阅读
                  </Link>
                  <button
                    type="button"
                    onClick={() => onRemove(item)}
                    className="rounded-lg border border-red-300/60 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50 dark:border-red-900/40 dark:text-red-200"
                  >
                    移除
                  </button>
                </div>
              </div>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-emerald-900 dark:text-emerald-100">
                <input
                  type="checkbox"
                  checked={item.enabledForAsk}
                  onChange={(e) => {
                    void setLiteratureEnabledForAsk(item.id, e.target.checked).then(refresh);
                  }}
                />
                在智能助手中引用此文
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
