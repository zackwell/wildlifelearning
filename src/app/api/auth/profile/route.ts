import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import {
  hashPassword,
  validatePassword,
  verifyPassword,
} from "@/lib/auth/password";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }
  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  let body: { displayName?: string; currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON。" }, { status: 400 });
  }

  const displayName =
    body.displayName !== undefined ? body.displayName.trim().slice(0, 40) : undefined;
  const newPassword = body.newPassword?.trim();
  const currentPassword = body.currentPassword ?? "";

  if (displayName !== undefined && displayName.length === 0) {
    return NextResponse.json({ error: "昵称不能为空。" }, { status: 400 });
  }

  if (newPassword) {
    const pwdErr = validatePassword(newPassword);
    if (pwdErr) return NextResponse.json({ error: pwdErr }, { status: 400 });
    if (!currentPassword) {
      return NextResponse.json({ error: "修改密码须填写当前密码。" }, { status: 400 });
    }
  }

  try {
    const db = getDb();
    const rows = await db
      .select({ passwordHash: schema.users.passwordHash })
      .from(schema.users)
      .where(eq(schema.users.id, sessionUser.id))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "用户不存在。" }, { status: 404 });
    }

    const updates: { displayName?: string; passwordHash?: string } = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (newPassword) {
      const ok = await verifyPassword(currentPassword, row.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: "当前密码不正确。" }, { status: 401 });
      }
      updates.passwordHash = await hashPassword(newPassword);
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: "没有可更新的内容。" }, { status: 400 });
    }

    const updated = await db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, sessionUser.id))
      .returning({
        email: schema.users.email,
        displayName: schema.users.displayName,
      });

    const user = updated[0];
    if (!user) {
      return NextResponse.json({ error: "更新失败。" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      user: { email: user.email, displayName: user.displayName },
    });
  } catch {
    return NextResponse.json({ error: "更新失败，请稍后重试。" }, { status: 500 });
  }
}
