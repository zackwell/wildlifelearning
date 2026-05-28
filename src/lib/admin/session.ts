import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_HOURS,
} from "@/lib/admin/constants";
import { getAdminSigningSecret } from "@/lib/admin/config";

export type AdminSession = {
  username: string;
};

function signPayload(payloadB64: string): string {
  return createHmac("sha256", getAdminSigningSecret())
    .update(payloadB64)
    .digest("base64url");
}

export function createAdminSessionToken(username: string): string {
  const exp = Date.now() + ADMIN_SESSION_HOURS * 60 * 60 * 1000;
  const payloadB64 = Buffer.from(JSON.stringify({ u: username, exp })).toString(
    "base64url",
  );
  return `${payloadB64}.${signPayload(payloadB64)}`;
}

function parseAdminSessionToken(token: string): AdminSession | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = signPayload(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as { u?: string; exp?: number };
    if (!payload.u || typeof payload.exp !== "number") return null;
    if (payload.exp <= Date.now()) return null;
    return { username: payload.u };
  } catch {
    return null;
  }
}

export function adminSessionCookieOptions(maxAgeSec: number) {
  const secure =
    process.env.SESSION_COOKIE_SECURE === "true" ||
    (process.env.SESSION_COOKIE_SECURE !== "false" &&
      (process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false));

  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return parseAdminSessionToken(token);
}

export function verifyAdminSessionToken(token: string): AdminSession | null {
  return parseAdminSessionToken(token);
}
