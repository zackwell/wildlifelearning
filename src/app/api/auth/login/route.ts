import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import {
  validateEmail,
  validatePassword,
  verifyPassword,
} from "@/lib/auth/password";
import {
  createSession,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth/constants";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON。" }, { status: 400 });
  }

  const emailErr = validateEmail(body.email ?? "");
  if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });
  const passwordErr = validatePassword(body.password ?? "");
  if (passwordErr) return NextResponse.json({ error: passwordErr }, { status: 400 });

  const email = body.email!.trim().toLowerCase();

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        displayName: schema.users.displayName,
        passwordHash: schema.users.passwordHash,
      })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    const user = rows[0];
    if (!user || !(await verifyPassword(body.password!, user.passwordHash))) {
      return NextResponse.json({ error: "邮箱或密码不正确。" }, { status: 401 });
    }

    const token = await createSession(user.id);
    const cookieStore = await cookies();
    cookieStore.set(
      SESSION_COOKIE,
      token,
      sessionCookieOptions(SESSION_DAYS * 24 * 60 * 60),
    );

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "登录失败";
    if (msg.includes("DATABASE_URL")) {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    return NextResponse.json({ error: "登录失败，请稍后重试。" }, { status: 500 });
  }
}
