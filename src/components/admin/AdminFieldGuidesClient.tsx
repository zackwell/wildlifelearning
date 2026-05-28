"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminExportToolbar } from "@/components/admin/AdminExportToolbar";

type EntryRow = {
  id: string;
  userId: string;
  userEmail: string;
  speciesName: string;
  scientificName: string;
  savedAt: string;
  starred: boolean;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN");
  } catch {
    return iso;
  }
}

export function AdminFieldGuidesClient() {
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q?.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/field-guides?${params}`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as { entries?: EntryRow[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "加载失败");
        return;
      }
      setEntries(data.entries ?? []);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteEntry(id: string, name: string) {
    if (!window.confirm(`确定删除图鉴「${name}」？`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/field-guides/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? "删除失败");
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      window.alert("网络错误");
    } finally {
      setDeletingId(null);
    }
  }

  const pdfColumns = [
    { key: "speciesName", label: "物种" },
    { key: "scientificName", label: "学名" },
    { key: "userEmail", label: "用户" },
    { key: "savedAt", label: "收藏时间" },
    { key: "starred", label: "星标" },
  ];
  const pdfRows = entries.map((e) => ({
    speciesName: e.speciesName,
    scientificName: e.scientificName || "—",
    userEmail: e.userEmail,
    savedAt: formatDate(e.savedAt),
    starred: e.starred ? "★" : "—",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-50">图鉴管理</h2>
        <p className="mt-1 text-sm text-stone-400">浏览与删除全站用户图鉴条目</p>
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load(query);
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索物种名、学名或用户邮箱"
          className="min-w-[16rem] flex-1 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm text-stone-100 hover:bg-stone-700"
        >
          搜索
        </button>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            void load();
          }}
          className="rounded-lg border border-stone-700 px-4 py-2 text-sm text-stone-300 hover:bg-stone-900"
        >
          重置
        </button>
      </form>

      <AdminExportToolbar
        resource="field-guides"
        query={query}
        pdfTitle="图鉴列表"
        pdfColumns={pdfColumns}
        pdfRows={pdfRows}
        disabled={loading}
      />

      {loading ? <p className="text-stone-400">加载中…</p> : null}
      {error ? <p className="text-red-400">{error}</p> : null}

      {!loading && !error ? (
        <div className="overflow-x-auto rounded-xl border border-stone-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-900 text-stone-400">
              <tr>
                <th className="px-4 py-3 font-medium">物种</th>
                <th className="px-4 py-3 font-medium">学名</th>
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="px-4 py-3 font-medium">收藏时间</th>
                <th className="px-4 py-3 font-medium">星标</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {entries.map((e) => (
                <tr key={e.id} className="bg-stone-950/50">
                  <td className="px-4 py-3 font-medium text-stone-100">{e.speciesName}</td>
                  <td className="px-4 py-3 italic text-stone-400">{e.scientificName || "—"}</td>
                  <td className="px-4 py-3 text-stone-300">{e.userEmail}</td>
                  <td className="px-4 py-3 text-stone-400">{formatDate(e.savedAt)}</td>
                  <td className="px-4 py-3">{e.starred ? "★" : "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={deletingId === e.id}
                      onClick={() => void deleteEntry(e.id, e.speciesName)}
                      className="text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      {deletingId === e.id ? "删除中…" : "删除"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!entries.length ? (
            <p className="px-4 py-8 text-center text-stone-500">暂无图鉴</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
