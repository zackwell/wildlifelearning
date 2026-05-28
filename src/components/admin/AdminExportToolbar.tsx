"use client";

import { useState } from "react";

export type AdminExportColumn = { key: string; label: string };

type Props = {
  resource: "users" | "field-guides" | "literature" | "stats";
  query?: string;
  pdfTitle: string;
  pdfColumns: AdminExportColumn[];
  pdfRows: Record<string, string>[];
  disabled?: boolean;
};

function buildPrintHtml(title: string, columns: AdminExportColumn[], rows: Record<string, string>[]) {
  const headCells = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const bodyRows = rows
    .map(
      (row) =>
        `<tr>${columns.map((c) => `<td>${escapeHtml(row[c.key] ?? "")}</td>`).join("")}</tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: "Microsoft YaHei", sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 20px; margin-bottom: 8px; }
    p.meta { color: #666; font-size: 12px; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">Nature+ 管理后台 · 导出时间 ${escapeHtml(new Date().toLocaleString("zh-CN"))} · 共 ${rows.length} 条</p>
  <table>
    <thead><tr>${headCells}</tr></thead>
    <tbody>${bodyRows || `<tr><td colspan="${columns.length}">无数据</td></tr>`}</tbody>
  </table>
  <script>window.onload = function(){ window.print(); };</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function AdminExportToolbar({
  resource,
  query,
  pdfTitle,
  pdfColumns,
  pdfRows,
  disabled,
}: Props) {
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);

  async function downloadExcel() {
    setExporting("xlsx");
    try {
      const params = new URLSearchParams({ resource, format: "xlsx" });
      if (query?.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/admin/export?${params}`, { credentials: "same-origin" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        window.alert(data.error ?? "导出失败");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename\*=UTF-8''(.+)/)?.[1] ??
        `export-${resource}.xlsx`;
      a.download = decodeURIComponent(a.download);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("网络错误");
    } finally {
      setExporting(null);
    }
  }

  function exportPdf() {
    setExporting("pdf");
    try {
      const html = buildPrintHtml(pdfTitle, pdfColumns, pdfRows);
      const w = window.open("", "_blank");
      if (!w) {
        window.alert("请允许弹出窗口以导出 PDF");
        return;
      }
      w.document.write(html);
      w.document.close();
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={disabled || exporting !== null}
        onClick={() => void downloadExcel()}
        className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 py-1.5 text-sm text-emerald-200 transition hover:bg-emerald-900/40 disabled:opacity-50"
      >
        {exporting === "xlsx" ? "导出中…" : "导出 Excel"}
      </button>
      <button
        type="button"
        disabled={disabled || exporting !== null || pdfRows.length === 0}
        onClick={exportPdf}
        className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 transition hover:bg-stone-800 disabled:opacity-50"
      >
        {exporting === "pdf" ? "打开中…" : "导出 PDF"}
      </button>
      <span className="text-xs text-stone-500">
        按当前{query?.trim() ? "筛选" : "列表"}共 {pdfRows.length} 条 · PDF 将在新窗口打开打印对话框
      </span>
    </div>
  );
}
