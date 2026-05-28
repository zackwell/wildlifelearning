import { NextResponse } from "next/server";
import { isAdminAuthResponse, requireAdmin } from "@/lib/admin/require-admin";
import { deleteAdminLiterature } from "@/lib/admin/data-server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: Params) {
  const adminOrRes = await requireAdmin(req);
  if (isAdminAuthResponse(adminOrRes)) return adminOrRes;

  const { id } = await params;
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId")?.trim();
  if (!id?.trim() || !userId) {
    return NextResponse.json({ error: "缺少文献 ID 或 userId。" }, { status: 400 });
  }

  try {
    const ok = await deleteAdminLiterature(userId, id);
    if (!ok) return NextResponse.json({ error: "文献不存在。" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "删除失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
