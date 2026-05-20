import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  deleteSessionByToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/constants";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await deleteSessionByToken(token);
    } catch {
      /* 仍清除 Cookie */
    }
  }
  cookieStore.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return NextResponse.json({ ok: true });
}
