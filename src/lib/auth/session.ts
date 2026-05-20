import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { eq, lt } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth/constants";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sessionExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DAYS);
  return d;
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const db = getDb();
  await db.insert(schema.sessions).values({
    userId,
    tokenHash,
    expiresAt: sessionExpiry(),
  });
  return token;
}

export async function deleteSessionByToken(token: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashToken(token)));
}

export function sessionCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const now = new Date();
  const rows = await db
    .select({
      sessionId: schema.sessions.id,
      userId: schema.users.id,
      email: schema.users.email,
      displayName: schema.users.displayName,
      expiresAt: schema.sessions.expiresAt,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.tokenHash, hashToken(token)))
    .limit(1);

  const row = rows[0];
  if (!row || row.expiresAt <= now) {
    if (row) {
      await db.delete(schema.sessions).where(eq(schema.sessions.id, row.sessionId));
    }
    return null;
  }

  return {
    id: row.userId,
    email: row.email,
    displayName: row.displayName,
  };
}

/** 清理过期会话（可选维护） */
export async function purgeExpiredSessions(): Promise<void> {
  const db = getDb();
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
}
