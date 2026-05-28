import { NextResponse } from "next/server";
import { isAdminAuthResponse, requireAdmin } from "@/lib/admin/require-admin";
import { purgeExpiredUserSessions } from "@/lib/admin/data-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const adminOrRes = await requireAdmin(req);
  if (isAdminAuthResponse(adminOrRes)) return adminOrRes;

  try {
    const removed = await purgeExpiredUserSessions();
    return NextResponse.json({ ok: true, removed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "清理失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
