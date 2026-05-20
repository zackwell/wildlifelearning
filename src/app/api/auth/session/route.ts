import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getSessionUser();
    return NextResponse.json({ user });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "会话读取失败";
    if (msg.includes("DATABASE_URL")) {
      return NextResponse.json({ user: null, error: msg }, { status: 503 });
    }
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
