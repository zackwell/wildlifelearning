import * as XLSX from "xlsx";
import {
  getAdminStats,
  listAdminFieldGuides,
  listAdminLiterature,
  listAdminUsers,
} from "@/lib/admin/data-server";

export type AdminExportResource = "users" | "field-guides" | "literature" | "stats";
export type AdminExportFormat = "xlsx" | "csv";

type SheetData = {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
};

function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildCsv(sheet: SheetData): Buffer {
  const lines = [
    sheet.headers.map(escapeCsvCell).join(","),
    ...sheet.rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return Buffer.from(`\uFEFF${lines.join("\n")}`, "utf8");
}

function buildXlsx(sheet: SheetData): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "数据");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

async function loadSheet(
  resource: AdminExportResource,
  query?: string,
): Promise<SheetData> {
  const q = query?.trim() || undefined;
  const stamp = new Date().toISOString().slice(0, 10);

  if (resource === "users") {
    const users = await listAdminUsers(500, 0);
    return {
      filename: `natureplus-users-${stamp}`,
      headers: ["邮箱", "昵称", "注册时间", "图鉴数", "文献数", "题库数", "用户ID"],
      rows: users.map((u) => [
        u.email,
        u.displayName ?? "",
        u.createdAt,
        u.fieldGuideCount,
        u.literatureCount,
        u.questionSetCount,
        u.id,
      ]),
    };
  }

  if (resource === "field-guides") {
    const entries = await listAdminFieldGuides(500, 0, q);
    return {
      filename: `natureplus-field-guides-${stamp}`,
      headers: ["物种", "学名", "用户邮箱", "收藏时间", "星标", "图鉴ID", "用户ID"],
      rows: entries.map((e) => [
        e.speciesName,
        e.scientificName,
        e.userEmail,
        e.savedAt,
        e.starred ? "是" : "否",
        e.id,
        e.userId,
      ]),
    };
  }

  if (resource === "literature") {
    const items = await listAdminLiterature(500, 0, q);
    return {
      filename: `natureplus-literature-${stamp}`,
      headers: ["标题", "文件名", "用户邮箱", "上传时间", "RAG启用", "文件字节", "文献ID", "用户ID"],
      rows: items.map((i) => [
        i.title,
        i.fileName,
        i.userEmail,
        i.uploadedAt,
        i.enabledForAsk ? "是" : "否",
        i.fileBytes ?? "",
        i.id,
        i.userId,
      ]),
    };
  }

  const stats = await getAdminStats();
  return {
    filename: `natureplus-stats-${stamp}`,
    headers: ["指标", "数值"],
    rows: [
      ["注册用户", stats.users],
      ["图鉴条目", stats.fieldGuides],
      ["题库条目", stats.questionSets],
      ["文献元数据", stats.literatureMeta],
      ["活跃会话", stats.sessions],
      ["今日新注册", stats.usersToday],
      ["今日新图鉴", stats.fieldGuidesToday],
      ["文献 JSON 文件数", stats.literatureFilesCount],
      ["文献占用字节", stats.literatureFilesBytes],
      ["内置 RAG 字节", stats.ragJsonBytes],
    ],
  };
}

export async function buildAdminExport(
  resource: AdminExportResource,
  format: AdminExportFormat,
  query?: string,
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const sheet = await loadSheet(resource, query);
  if (format === "csv") {
    return {
      buffer: buildCsv(sheet),
      filename: `${sheet.filename}.csv`,
      contentType: "text/csv; charset=utf-8",
    };
  }
  return {
    buffer: buildXlsx(sheet),
    filename: `${sheet.filename}.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

export type AdminExportColumn = { key: string; label: string };

export function rowsForPdf(
  resource: AdminExportResource,
  sheet: SheetData,
): { title: string; columns: AdminExportColumn[]; rows: Record<string, string>[] } {
  const titles: Record<AdminExportResource, string> = {
    users: "用户列表",
    "field-guides": "图鉴列表",
    literature: "文献列表",
    stats: "数据概览",
  };
  const columns = sheet.headers.map((label, i) => ({
    key: String(i),
    label,
  }));
  const rows = sheet.rows.map((row) => {
    const obj: Record<string, string> = {};
    row.forEach((cell, i) => {
      obj[String(i)] = String(cell);
    });
    return obj;
  });
  return { title: titles[resource], columns, rows };
}

export async function loadAdminExportSheet(
  resource: AdminExportResource,
  query?: string,
): Promise<SheetData> {
  return loadSheet(resource, query);
}
