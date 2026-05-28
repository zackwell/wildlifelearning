"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminExportToolbar } from "@/components/admin/AdminExportToolbar";

type LitRow = {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  fileName: string;
  uploadedAt: string;
  enabledForAsk: boolean;
  fileBytes: number | null;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN");
  } catch {
    return iso;
  }
}

function formatBytes(n: number | null): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function AdminLiteratureClient() {
  const [items, setItems] = useState<LitRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q?.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/literature?${params}`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as { items?: LitRow[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "加载失败");
        return;
      }
      setItems(data.items ?? []);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteItem(userId: string, id: string, title: string) {
    if (!window.confirm(`确定删除文献「${title}」？\n将删除元数据与服务器上的 JSON 正文。`)) {
      return;
    }
    const key = `${userId}:${id}`;
    setDeletingKey(key);
    try {
      const params = new URLSearchParams({ userId });
      const res = await fetch(
        `/api/admin/literature/${encodeURIComponent(id)}?${params}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? "删除失败");
        return;
      }
      setItems((prev) => prev.filter((i) => !(i.userId === userId && i.id === id)));
    } catch {
      window.alert("网络错误");
    } finally {
      setDeletingKey(null);
    }
  }

  const pdfColumns = [
    { key: "title", label: "标题" },
    { key: "fileName", label: "文件名" },
    { key: "userEmail", label: "用户" },
    { key: "uploadedAt", label: "上传时间" },
    { key: "enabledForAsk", label: "RAG" },
    { key: "fileBytes", label: "体积" },
  ];
  const pdfRows = items.map((item) => ({
    title: item.title,
    fileName: item.fileName,
    userEmail: item.userEmail,
    uploadedAt: formatDate(item.uploadedAt),
    enabledForAsk: item.enabledForAsk ? "启用" : "关闭",
    fileBytes: formatBytes(item.fileBytes),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-50">文献管理</h2>
        <p className="mt-1 text-sm text-stone-400">元数据来自 Neon，正文存于 data/users/…/literature/</p>
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
          placeholder="搜索标题、文件名或用户邮箱"
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
        resource="literature"
        query={query}
        pdfTitle="文献列表"
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
                <th className="px-4 py-3 font-medium">标题</th>
                <th className="px-4 py-3 font-medium">文件名</th>
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="px-4 py-3 font-medium">上传时间</th>
                <th className="px-4 py-3 font-medium">RAG</th>
                <th className="px-4 py-3 font-medium">体积</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {items.map((item) => {
                const key = `${item.userId}:${item.id}`;
                return (
                  <tr key={key} className="bg-stone-950/50">
                    <td className="px-4 py-3 font-medium text-stone-100">{item.title}</td>
                    <td className="px-4 py-3 text-stone-400">{item.fileName}</td>
                    <td className="px-4 py-3 text-stone-300">{item.userEmail}</td>
                    <td className="px-4 py-3 text-stone-400">{formatDate(item.uploadedAt)}</td>
                    <td className="px-4 py-3">
                      {item.enabledForAsk ? (
                        <span className="text-emerald-400">启用</span>
                      ) : (
                        <span className="text-stone-500">关闭</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-400">{formatBytes(item.fileBytes)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={deletingKey === key}
                        onClick={() => void deleteItem(item.userId, item.id, item.title)}
                        className="text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        {deletingKey === key ? "删除中…" : "删除"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!items.length ? (
            <p className="px-4 py-8 text-center text-stone-500">暂无文献</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
