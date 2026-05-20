import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import {
  hashPassword,
  validateEmail,
  validatePassword,
} from "@/lib/auth/password";
import {
  createSession,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth/constants";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: string; password?: string; displayName?: string };
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
  const displayName = (body.displayName ?? "").trim().slice(0, 40) || null;

  try {
    const db = getDb();
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    if (existing.length) {
      return NextResponse.json({ error: "该邮箱已注册，请直接登录。" }, { status: 409 });
    }

    const passwordHash = await hashPassword(body.password!);
    const inserted = await db
      .insert(schema.users)
      .values({ email, passwordHash, displayName })
      .returning({ id: schema.users.id });

    const userId = inserted[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: "注册失败，请重试。" }, { status: 500 });
    }

    const token = await createSession(userId);
    const cookieStore = await cookies();
    cookieStore.set(
      SESSION_COOKIE,
      token,
      sessionCookieOptions(SESSION_DAYS * 24 * 60 * 60),
    );

    return NextResponse.json({
      ok: true,
      user: { id: userId, email, displayName },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "注册失败";
    if (msg.includes("DATABASE_URL")) {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    return NextResponse.json({ error: "注册失败，请稍后重试。" }, { status: 500 });
  }
}
