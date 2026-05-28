import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  isAdminConfigured,
  verifyAdminCredentials,
} from "@/lib/admin/config";
import { isAdminIpAllowed, adminIpDeniedMessage } from "@/lib/admin/ip-allowlist";
import { allowAdminLogin, clientIp } from "@/lib/admin/rate-limit";
import {
  adminSessionCookieOptions,
  createAdminSessionToken,
} from "@/lib/admin/session";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_HOURS,
} from "@/lib/admin/constants";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "管理员功能未配置。" }, { status: 503 });
  }
  if (!isAdminIpAllowed(req)) {
    return NextResponse.json({ error: adminIpDeniedMessage(req) }, { status: 403 });
  }

  const ip = clientIp(req);
  if (!allowAdminLogin(ip)) {
    return NextResponse.json({ error: "登录尝试过于频繁，请稍后再试。" }, { status: 429 });
  }

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON。" }, { status: 400 });
  }

  const username = (body.username ?? "").trim();
  const password = body.password ?? "";
  if (!username || !password) {
    return NextResponse.json({ error: "请输入用户名和密码。" }, { status: 400 });
  }

  if (!verifyAdminCredentials(username, password)) {
    return NextResponse.json({ error: "用户名或密码不正确。" }, { status: 401 });
  }

  const token = createAdminSessionToken(username);
  const cookieStore = await cookies();
  cookieStore.set(
    ADMIN_SESSION_COOKIE,
    token,
    adminSessionCookieOptions(ADMIN_SESSION_HOURS * 60 * 60),
  );

  return NextResponse.json({ ok: true, username });
}
