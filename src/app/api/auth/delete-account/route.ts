import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteUserAccount } from "@/lib/auth/delete-account";
import { getSessionUser, sessionCookieOptions } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/constants";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  let body: { currentPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON。" }, { status: 400 });
  }

  const result = await deleteUserAccount(user.id, body.currentPassword ?? "");
  if (!("ok" in result)) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", sessionCookieOptions(0));

  return NextResponse.json({ ok: true });
}
