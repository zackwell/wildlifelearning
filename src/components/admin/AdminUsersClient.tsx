"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminExportToolbar } from "@/components/admin/AdminExportToolbar";

type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  fieldGuideCount: number;
  literatureCount: number;
  questionSetCount: number;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN");
  } catch {
    return iso;
  }
}

export function AdminUsersClient() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", { credentials: "same-origin" });
      const data = (await res.json()) as { users?: UserRow[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "加载失败");
        return;
      }
      setUsers(data.users ?? []);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteUser(id: string, email: string) {
    if (
      !window.confirm(
        `确定删除用户 ${email}？\n将同时删除其图鉴、题库、文献元数据及服务器上的文献文件。`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? "删除失败");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {
      window.alert("网络错误");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <p className="text-stone-400">加载中…</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  const pdfColumns = [
    { key: "email", label: "邮箱" },
    { key: "displayName", label: "昵称" },
    { key: "createdAt", label: "注册时间" },
    { key: "fieldGuideCount", label: "图鉴" },
    { key: "literatureCount", label: "文献" },
    { key: "questionSetCount", label: "题库" },
  ];
  const pdfRows = users.map((u) => ({
    email: u.email,
    displayName: u.displayName ?? "—",
    createdAt: formatDate(u.createdAt),
    fieldGuideCount: String(u.fieldGuideCount),
    literatureCount: String(u.literatureCount),
    questionSetCount: String(u.questionSetCount),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-stone-50">用户管理</h2>
          <p className="mt-1 text-sm text-stone-400">共 {users.length} 条（最近 100 条）</p>
        </div>
        <AdminExportToolbar
          resource="users"
          pdfTitle="用户列表"
          pdfColumns={pdfColumns}
          pdfRows={pdfRows}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-900 text-stone-400">
            <tr>
              <th className="px-4 py-3 font-medium">邮箱</th>
              <th className="px-4 py-3 font-medium">昵称</th>
              <th className="px-4 py-3 font-medium">注册时间</th>
              <th className="px-4 py-3 font-medium">图鉴</th>
              <th className="px-4 py-3 font-medium">文献</th>
              <th className="px-4 py-3 font-medium">题库</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800">
            {users.map((u) => (
              <tr key={u.id} className="bg-stone-950/50">
                <td className="px-4 py-3 text-stone-100">{u.email}</td>
                <td className="px-4 py-3 text-stone-300">{u.displayName || "—"}</td>
                <td className="px-4 py-3 text-stone-400">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">{u.fieldGuideCount}</td>
                <td className="px-4 py-3">{u.literatureCount}</td>
                <td className="px-4 py-3">{u.questionSetCount}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={deletingId === u.id}
                    onClick={() => void deleteUser(u.id, u.email)}
                    className="text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    {deletingId === u.id ? "删除中…" : "删除"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length ? (
          <p className="px-4 py-8 text-center text-stone-500">暂无用户</p>
        ) : null}
      </div>
    </div>
  );
}
