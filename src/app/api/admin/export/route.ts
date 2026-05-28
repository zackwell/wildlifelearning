import { NextResponse } from "next/server";
import {
  buildAdminExport,
  type AdminExportFormat,
  type AdminExportResource,
} from "@/lib/admin/export-build";
import { isAdminAuthResponse, requireAdmin } from "@/lib/admin/require-admin";

export const runtime = "nodejs";

const RESOURCES: AdminExportResource[] = ["users", "field-guides", "literature", "stats"];
const FORMATS: AdminExportFormat[] = ["xlsx", "csv"];

export async function GET(req: Request) {
  const adminOrRes = await requireAdmin(req);
  if (isAdminAuthResponse(adminOrRes)) return adminOrRes;

  const url = new URL(req.url);
  const resource = url.searchParams.get("resource") as AdminExportResource | null;
  const format = (url.searchParams.get("format") ?? "xlsx") as AdminExportFormat;
  const query = url.searchParams.get("q") ?? undefined;

  if (!resource || !RESOURCES.includes(resource)) {
    return NextResponse.json({ error: "无效的 resource 参数。" }, { status: 400 });
  }
  if (!FORMATS.includes(format)) {
    return NextResponse.json({ error: "format 须为 xlsx 或 csv。" }, { status: 400 });
  }

  try {
    const { buffer, filename, contentType } = await buildAdminExport(resource, format, query);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "导出失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
