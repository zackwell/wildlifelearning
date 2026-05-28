import { NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/admin/config";
import { isAdminIpAllowed, adminIpDeniedMessage } from "@/lib/admin/ip-allowlist";
import { getAdminSession, type AdminSession } from "@/lib/admin/session";

export async function requireAdmin(
  req: Request,
): Promise<AdminSession | NextResponse> {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "管理员功能未配置。" }, { status: 503 });
  }
  if (!isAdminIpAllowed(req)) {
    return NextResponse.json({ error: adminIpDeniedMessage(req) }, { status: 403 });
  }
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录管理员账号。" }, { status: 401 });
  }
  return session;
}

export function isAdminAuthResponse(
  v: AdminSession | NextResponse,
): v is NextResponse {
  return v instanceof NextResponse;
}
