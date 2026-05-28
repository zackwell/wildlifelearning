import { NextResponse } from "next/server";
import { isPredominantlyChinese } from "@/lib/literature/detect-language";
import {
  deleteLiteratureDocument,
  readLiteratureDocument,
} from "@/lib/literature/server-store";
import { isAuthResponse, requireUser } from "@/lib/auth/require-user";
import {
  deleteUserLiteratureMeta,
  userOwnsLiterature,
} from "@/lib/user-data/literature-meta-server";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

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
  return NextResponse.json({
    id: doc.id,
    title: doc.title,
    fileName: doc.fileName,
    uploadedAt: doc.uploadedAt,
    body: doc.body,
    predominantlyChinese: isPredominantlyChinese(doc.body),
    translation: doc.translation
      ? {
          status: doc.translation.status,
          translatedAt: doc.translation.translatedAt,
          zhBody: doc.translation.zhBody,
          error: doc.translation.error,
          mode: doc.translation.mode,
          chunkCount: doc.translation.zhChunks?.length ?? 0,
        }
      : null,
  });
}

export async function DELETE(_req: Request, props: Props) {
  const userOrRes = await requireUser();
  if (isAuthResponse(userOrRes)) return userOrRes;
  const { id } = await props.params;
  if (!(await userOwnsLiterature(userOrRes.id, id))) {
    return NextResponse.json({ error: "未找到该资料。" }, { status: 404 });
  }
  deleteLiteratureDocument(userOrRes.id, id);
  await deleteUserLiteratureMeta(userOrRes.id, id);
  return NextResponse.json({ ok: true });
}
