import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import {
  deriveLiteratureTitle,
  splitTextIntoChunks,
} from "@/lib/rag/chunk-text";
import type { LiteratureDocument, RagChunk } from "@/lib/rag/types";

const MAX_BODY_CHARS = 400_000;

export function buildLiteratureChunks(
  docId: string,
  title: string,
  body: string,
): RagChunk[] {
  const parts = splitTextIntoChunks(body);
  return parts.map((text, idx) => ({
    id: `literature:${docId}:${idx}`,
    text,
    speciesId: null,
    sourceType: "literature" as const,
    sourceTitle: title,
    sourcePath: `/topics/read/${docId}`,
    embedding: undefined,
  }));
}

export async function embedLiteratureChunks(
  chunks: RagChunk[],
  client: OpenAI,
  model: string,
): Promise<void> {
  const batchSize = 16;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const slice = chunks.slice(i, i + batchSize);
    const res = await client.embeddings.create({
      model,
      input: slice.map((c) => c.text),
    });
    const vectors = res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding as number[]);
    slice.forEach((c, j) => {
      c.embedding = vectors[j];
    });
  }
}

export async function createLiteratureDocument(opts: {
  fileName: string;
  body: string;
  title?: string;
  client?: OpenAI;
  embedModel?: string;
}): Promise<LiteratureDocument> {
  const body = opts.body.trim().slice(0, MAX_BODY_CHARS);
  if (body.length < 20) {
    throw new Error("文件内容过短，请上传有效文本。");
  }

  const id = randomUUID();
  const title = (opts.title?.trim() || deriveLiteratureTitle(opts.fileName, body)).slice(0, 120);
  const chunks = buildLiteratureChunks(id, title, body);

  if (opts.client && opts.embedModel) {
    try {
      await embedLiteratureChunks(chunks, opts.client, opts.embedModel);
    } catch {
      /* 无向量时仍可用关键词检索 */
    }
  }

  return {
    id,
    title,
    fileName: opts.fileName.slice(0, 200),
    uploadedAt: new Date().toISOString(),
    body,
    chunks,
  };
}
