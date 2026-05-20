import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  LITERATURE_ALLOWED_EXT,
  MAX_LITERATURE_FILE_BYTES,
} from "@/lib/literature/constants";
import { createLiteratureDocument } from "@/lib/literature/ingest";
import { writeLiteratureDocument } from "@/lib/literature/server-store";
import { isAuthResponse, requireUser } from "@/lib/auth/require-user";
import { insertUserLiteratureMeta } from "@/lib/user-data/literature-meta-server";

export const runtime = "nodejs";
export const maxDuration = 60;

function resolveApiKey(): string {
  return (
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.OLLAMA_API_KEY?.trim() ||
    ""
  );
}

function resolveBaseUrl(): string | undefined {
  const u =
    process.env.OPENAI_BASE_URL?.trim() ||
    process.env.OLLAMA_BASE_URL?.trim() ||
    "";
  return u || undefined;
}

function emptyExtractMessage(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) {
    return "未能从 PDF 中提取到文字，可能是扫描版或图片型文档。";
  }
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) {
    return "未能从 Word 文档中提取到文字，请确认文件未损坏。";
  }
  return "文件内容为空或无法识别。";
}

export async function POST(req: Request) {
  const userOrRes = await requireUser();
  if (isAuthResponse(userOrRes)) return userOrRes;

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let fileName = "";
    let buffer: Buffer;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "请选择要上传的文件。" }, { status: 400 });
      }
      fileName = file.name.trim();
      if (file.size > MAX_LITERATURE_FILE_BYTES) {
        return NextResponse.json({ error: "文件过大，请控制在 10MB 以内。" }, { status: 400 });
      }
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      let body: { fileName?: string; text?: string; title?: string };
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ error: "无效的请求。" }, { status: 400 });
      }
      fileName = (body.fileName ?? "").trim();
      const text = (body.text ?? "").trim();
      if (!fileName || !text) {
        return NextResponse.json({ error: "请选择要上传的文件。" }, { status: 400 });
      }
      buffer = Buffer.from(text, "utf8");
    }

    if (!fileName || !LITERATURE_ALLOWED_EXT.test(fileName)) {
      return NextResponse.json(
        { error: "支持 .txt、.md、.pdf、.doc、.docx 格式。" },
        { status: 400 },
      );
    }
    if (buffer.length === 0 || buffer.length > MAX_LITERATURE_FILE_BYTES) {
      return NextResponse.json(
        { error: "文件为空或超出大小限制（10MB）。" },
        { status: 400 },
      );
    }

    let text: string;
    try {
      const { extractLiteratureText } = await import("@/lib/literature/extract-text");
      text = await extractLiteratureText(buffer, fileName);
    } catch {
      return NextResponse.json(
        { error: "文件解析失败，请确认格式正确且未加密。" },
        { status: 400 },
      );
    }

    if (!text || text.length < 20) {
      return NextResponse.json({ error: emptyExtractMessage(fileName) }, { status: 400 });
    }

    const apiKey = resolveApiKey();
    const client = apiKey
      ? new OpenAI({ apiKey, baseURL: resolveBaseUrl() || undefined })
      : undefined;
    const embedModel = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

    const doc = await createLiteratureDocument({
      fileName,
      body: text,
      client,
      embedModel: client ? embedModel : undefined,
    });

    writeLiteratureDocument(userOrRes.id, doc);
    await insertUserLiteratureMeta(userOrRes.id, {
      id: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      uploadedAt: doc.uploadedAt,
      enabledForAsk: true,
    });

    return NextResponse.json({
      id: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      uploadedAt: doc.uploadedAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "上传失败";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
