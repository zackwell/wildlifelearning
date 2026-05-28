import { NextResponse } from "next/server";
import {
  readLiteratureDocument,
  writeLiteratureDocument,
} from "@/lib/literature/server-store";
import {
  createProcessingTranslation,
  isPredominantlyChinese,
  runLiteratureRagJob,
} from "@/lib/literature/translate";
import { isAuthResponse, requireUser } from "@/lib/auth/require-user";
import { userOwnsLiterature } from "@/lib/user-data/literature-meta-server";

export const runtime = "nodejs";
export const maxDuration = 300;

type Props = { params: Promise<{ id: string }> };

export async function POST(_req: Request, props: Props) {
  const userOrRes = await requireUser();
  if (isAuthResponse(userOrRes)) return userOrRes;

  const { id } = await props.params;
  if (!(await userOwnsLiterature(userOrRes.id, id))) {
    return NextResponse.json({ error: "未找到该资料。" }, { status: 404 });
  }

  const doc = readLiteratureDocument(userOrRes.id, id);
  if (!doc) {
    return NextResponse.json({ error: "未找到该资料。" }, { status: 404 });
  }

  if (doc.translation?.status === "processing") {
    return NextResponse.json({ ok: true, processing: true, already: true });
  }

  const mode = isPredominantlyChinese(doc.body) ? "format" : "translate";
  writeLiteratureDocument(userOrRes.id, {
    ...doc,
    translation: createProcessingTranslation(mode),
  });

  void runLiteratureRagJob(userOrRes.id, id);

  return NextResponse.json({
    ok: true,
    processing: true,
    mode,
  });
}

export async function GET(_req: Request, props: Props) {
  const userOrRes = await requireUser();
  if (isAuthResponse(userOrRes)) return userOrRes;

  const { id } = await props.params;
  if (!(await userOwnsLiterature(userOrRes.id, id))) {
    return NextResponse.json({ error: "未找到该资料。" }, { status: 404 });
  }

  const doc = readLiteratureDocument(userOrRes.id, id);
  if (!doc) {
    return NextResponse.json({ error: "未找到该资料。" }, { status: 404 });
  }

  const tr = doc.translation;
  return NextResponse.json({
    status: tr?.status ?? "none",
    mode: tr?.mode,
    error: tr?.error,
    zhRagReady: tr?.status === "ready",
    translatedAt: tr?.translatedAt,
  });
}
