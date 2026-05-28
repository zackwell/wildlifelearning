import { NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/admin/config";
import { isAdminIpAllowed } from "@/lib/admin/ip-allowlist";
import { getAdminSession } from "@/lib/admin/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ configured: false, authenticated: false });
  }
  if (!isAdminIpAllowed(req)) {
    return NextResponse.json({ configured: true, authenticated: false, forbidden: true });
  }
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ configured: true, authenticated: false });
  }
  return NextResponse.json({
    configured: true,
    authenticated: true,
    username: session.username,
  });
}
