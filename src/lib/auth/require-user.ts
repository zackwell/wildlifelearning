import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";

export async function requireUser(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }
  return user;
}

export function isAuthResponse(v: SessionUser | NextResponse): v is NextResponse {
  return v instanceof NextResponse;
}
