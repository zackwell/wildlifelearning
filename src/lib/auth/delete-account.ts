import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/password";
import { getDb, schema } from "@/lib/db";
import { deleteUserDataDir } from "@/lib/user-data/user-files";

type DeleteResult = { ok: true } | { error: string; status: number };

export async function deleteUserAccount(
  userId: string,
  currentPassword: string,
): Promise<DeleteResult> {
  const password = currentPassword.trim();
  if (!password) {
    return { error: "请输入当前密码以确认注销。", status: 400 };
  }

  const db = getDb();
  const rows = await db
    .select({ passwordHash: schema.users.passwordHash })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return { error: "用户不存在。", status: 404 };
  }

  const valid = await verifyPassword(password, row.passwordHash);
  if (!valid) {
    return { error: "当前密码不正确。", status: 401 };
  }

  try {
    const deleted = await db
      .delete(schema.users)
      .where(eq(schema.users.id, userId))
      .returning({ id: schema.users.id });
    if (!deleted[0]) {
      return { error: "注销失败，请稍后重试。", status: 500 };
    }
    deleteUserDataDir(userId);
    return { ok: true };
  } catch {
    return { error: "注销失败，请稍后重试。", status: 500 };
  }
}
