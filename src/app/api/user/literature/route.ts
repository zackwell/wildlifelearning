import { NextResponse } from "next/server";
import { isPredominantlyChinese } from "@/lib/literature/detect-language";
import { readLiteratureDocument } from "@/lib/literature/server-store";
import { isAuthResponse, requireUser } from "@/lib/auth/require-user";
import {
  listUserLiteratureMeta,
  setUserLiteratureEnabled,
} from "@/lib/user-data/literature-meta-server";

export const runtime = "nodejs";

function enrichLiteratureList(userId: string, list: Awaited<ReturnType<typeof listUserLiteratureMeta>>) {
  return list.map((meta) => {
    const doc = readLiteratureDocument(userId, meta.id);
    const tr = doc?.translation;
    return {
      ...meta,
      zhRagReady: tr?.status === "ready",
      translationFailed: tr?.status === "failed",
      translationProcessing: tr?.status === "processing",
      predominantlyChinese: doc ? isPredominantlyChinese(doc.body) : false,
    };
  });
}

export async function GET() {
  const userOrRes = await requireUser();
  if (isAuthResponse(userOrRes)) return userOrRes;
  const list = await listUserLiteratureMeta(userOrRes.id);
  return NextResponse.json({ list: enrichLiteratureList(userOrRes.id, list) });
}

export async function PATCH(req: Request) {
  const userOrRes = await requireUser();
  if (isAuthResponse(userOrRes)) return userOrRes;
  let body: { id?: string; enabledForAsk?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON。" }, { status: 400 });
  }
  if (!body.id || typeof body.enabledForAsk !== "boolean") {
    return NextResponse.json({ error: "参数无效。" }, { status: 400 });
  }
  const ok = await setUserLiteratureEnabled(userOrRes.id, body.id, body.enabledForAsk);
  if (!ok) {
    return NextResponse.json({ error: "未找到该文献。" }, { status: 404 });
  }
  const list = await listUserLiteratureMeta(userOrRes.id);
  return NextResponse.json({ list: enrichLiteratureList(userOrRes.id, list) });
}
