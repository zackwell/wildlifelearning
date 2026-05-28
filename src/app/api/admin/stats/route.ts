import { NextResponse } from "next/server";
import { isAdminAuthResponse, requireAdmin } from "@/lib/admin/require-admin";
import { getAdminStats } from "@/lib/admin/data-server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const adminOrRes = await requireAdmin(req);
  if (isAdminAuthResponse(adminOrRes)) return adminOrRes;
  try {
    const stats = await getAdminStats();
    return NextResponse.json({ stats });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "读取统计失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
