"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminExportToolbar } from "@/components/admin/AdminExportToolbar";

type Stats = {
  users: number;
  fieldGuides: number;
  questionSets: number;
  literatureMeta: number;
  sessions: number;
  usersToday: number;
  fieldGuidesToday: number;
  literatureFilesBytes: number;
  literatureFilesCount: number;
  ragJsonBytes: number;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
      <p className="text-sm text-stone-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-stone-50">{value}</p>
    </div>
  );
}

export function AdminDashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/stats", { credentials: "same-origin" });
      const data = (await res.json()) as { stats?: Stats; error?: string };
      if (!res.ok) {
        setError(data.error ?? "加载失败");
        return;
      }
      setStats(data.stats ?? null);
    } catch {
      setError("网络错误");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function purgeSessions() {
    setPurging(true);
    setPurgeMsg(null);
    try {
      const res = await fetch("/api/admin/maintenance/purge-sessions", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { removed?: number; error?: string };
      if (!res.ok) {
        setPurgeMsg(data.error ?? "清理失败");
        return;
      }
      setPurgeMsg(`已清理 ${data.removed ?? 0} 条过期用户会话`);
      void load();
    } catch {
      setPurgeMsg("网络错误");
    } finally {
      setPurging(false);
    }
  }

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  if (!stats) {
    return <p className="text-stone-400">加载中…</p>;
  }

  const pdfColumns = [
    { key: "label", label: "指标" },
    { key: "value", label: "数值" },
  ];
  const pdfRows = [
    { label: "注册用户", value: String(stats.users) },
    { label: "图鉴条目", value: String(stats.fieldGuides) },
    { label: "题库条目", value: String(stats.questionSets) },
    { label: "文献元数据", value: String(stats.literatureMeta) },
    { label: "活跃用户会话", value: String(stats.sessions) },
    { label: "今日新注册", value: String(stats.usersToday) },
    { label: "今日新图鉴", value: String(stats.fieldGuidesToday) },
    { label: "文献 JSON 文件", value: String(stats.literatureFilesCount) },
    { label: "文献占用空间", value: formatBytes(stats.literatureFilesBytes) },
    { label: "内置 RAG 体积", value: formatBytes(stats.ragJsonBytes) },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-stone-50">数据概览</h2>
          <p className="mt-1 text-sm text-stone-400">全站 Neon 与本地文献存储统计</p>
        </div>
        <AdminExportToolbar
          resource="stats"
          pdfTitle="数据概览"
          pdfColumns={pdfColumns}
          pdfRows={pdfRows}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="注册用户" value={stats.users} />
        <StatCard label="图鉴条目" value={stats.fieldGuides} />
        <StatCard label="题库条目" value={stats.questionSets} />
        <StatCard label="文献元数据" value={stats.literatureMeta} />
        <StatCard label="活跃用户会话" value={stats.sessions} />
        <StatCard label="今日新注册" value={stats.usersToday} />
        <StatCard label="今日新图鉴" value={stats.fieldGuidesToday} />
        <StatCard label="文献 JSON 文件" value={stats.literatureFilesCount} />
        <StatCard label="文献占用空间" value={formatBytes(stats.literatureFilesBytes)} />
        <StatCard label="内置 RAG 体积" value={formatBytes(stats.ragJsonBytes)} />
      </div>

      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5">
        <h3 className="font-medium text-stone-100">运维</h3>
        <p className="mt-1 text-sm text-stone-400">清理数据库中已过期的普通用户登录会话</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={purging}
            onClick={() => void purgeSessions()}
            className="rounded-lg border border-stone-600 px-4 py-2 text-sm text-stone-200 transition hover:bg-stone-800 disabled:opacity-60"
          >
            {purging ? "清理中…" : "清理过期会话"}
          </button>
          {purgeMsg ? <span className="text-sm text-stone-400">{purgeMsg}</span> : null}
        </div>
      </div>
    </div>
  );
}
