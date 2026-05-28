import { NextResponse } from "next/server";
import { isAdminAuthResponse, requireAdmin } from "@/lib/admin/require-admin";
import { listAdminLiterature } from "@/lib/admin/data-server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const adminOrRes = await requireAdmin(req);
  if (isAdminAuthResponse(adminOrRes)) return adminOrRes;

  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 100)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));
  const q = url.searchParams.get("q") ?? undefined;

  try {
    const items = await listAdminLiterature(limit, offset, q);
    return NextResponse.json({ items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "读取文献失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
