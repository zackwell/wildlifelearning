import OpenAI from "openai";
import { isPredominantlyChinese } from "@/lib/literature/detect-language";
import {
  buildLiteratureChunks,
  embedLiteratureChunks,
} from "@/lib/literature/ingest";
import {
  readLiteratureDocument,
  writeLiteratureDocument,
} from "@/lib/literature/server-store";
import type { LiteratureDocument, LiteratureTranslation } from "@/lib/rag/types";

const SEGMENT_SIZE = 3200;

const TRANSLATE_SYSTEM = `你是学术与保护生物学文献译者。用户会提供一段外文正文（多为英文）。
请译为流畅的简体中文，并做轻度排版优化，便于阅读与检索。

要求：
1. 准确翻译专业术语；重要英文术语首次出现时用「中文（English）」格式保留对照。
2. 物种学名、拉丁学名、缩写（如 IUCN、GPS）可保留英文/拉丁形式。
3. 恢复合理段落结构；若原文有章节感，可用 Markdown 二级标题（##）分隔。
4. 只输出译文正文，不要前言、后记或「以下是翻译」等说明。
5. 不要编造原文没有的内容。`;

const FORMAT_SYSTEM = `你是中文学术文献编辑。用户提供的中文正文可能来自 PDF 提取，段落混乱、缺少标题。
请在不改变原意的前提下做智能排版优化，便于阅读与检索。

要求：
1. 保持中文原意，不要翻译、不要扩写、不要删减实质内容。
2. 合并错误断行，恢复合理段落；识别章节结构时可加 Markdown 二级标题（##）。
3. 修正明显 OCR/提取错误（如多余空格、断词），专业术语与学名保持不变。
4. 只输出排版后的正文，不要说明性前后缀。`;

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

function splitSegments(body: string): string[] {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const segments: string[] = [];
  let buf = "";
  for (const p of paragraphs) {
    if ((buf + "\n\n" + p).length > SEGMENT_SIZE && buf) {
      segments.push(buf);
      buf = p;
    } else {
      buf = buf ? `${buf}\n\n${p}` : p;
    }
  }
  if (buf) segments.push(buf);
  if (segments.length === 0 && body.trim()) {
    for (let i = 0; i < body.length; i += SEGMENT_SIZE) {
      segments.push(body.slice(i, i + SEGMENT_SIZE));
    }
  }
  return segments;
}

async function processSegment(
  client: OpenAI,
  model: string,
  system: string,
  segment: string,
  index: number,
  total: number,
  actionLabel: string,
): Promise<string> {
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content:
          total > 1
            ? `这是全文第 ${index + 1}/${total} 段，请接续上文语气${actionLabel}：\n\n${segment}`
            : segment,
      },
    ],
  });
  const out = completion.choices[0]?.message?.content?.trim();
  if (!out) throw new Error(`第 ${index + 1} 段处理失败。`);
  return out;
}

export function createProcessingTranslation(mode: "translate" | "format"): LiteratureTranslation {
  return {
    status: "processing",
    translatedAt: new Date().toISOString(),
    zhBody: "",
    zhChunks: [],
    mode,
  };
}

export async function translateLiteratureDocument(
  doc: LiteratureDocument,
): Promise<LiteratureTranslation> {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error("未配置 OPENAI_API_KEY，无法处理。");
  }

  const formatOnly = isPredominantlyChinese(doc.body);
  const mode: "translate" | "format" = formatOnly ? "format" : "translate";
  const system = formatOnly ? FORMAT_SYSTEM : TRANSLATE_SYSTEM;
  const actionLabel = formatOnly ? "排版" : "翻译";
  const ragTitle = formatOnly
    ? `${doc.title}（检索优化版）`
    : `${doc.title}（中文检索版）`;

  const chatModel = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
  const embedModel = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  const client = new OpenAI({ apiKey, baseURL: resolveBaseUrl() || undefined });

  const segments = splitSegments(doc.body);
  const parts: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const part = await processSegment(
      client,
      chatModel,
      system,
      segments[i]!,
      i,
      segments.length,
      actionLabel,
    );
    parts.push(part);
  }

  const zhBody = parts.join("\n\n").trim();
  if (zhBody.length < 20) {
    throw new Error("处理结果过短，请检查原文或稍后重试。");
  }

  const zhChunks = buildLiteratureChunks(doc.id, ragTitle, zhBody).map((c) => ({
    ...c,
    id: c.id.replace(/^literature:/, "literature-zh:"),
  }));

  try {
    await embedLiteratureChunks(zhChunks, client, embedModel);
  } catch {
    /* 无向量时仍可用关键词检索 */
  }

  return {
    status: "ready",
    translatedAt: new Date().toISOString(),
    zhBody,
    zhChunks,
    mode,
  };
}

/** 后台任务：完成后写入文献 JSON */
export async function runLiteratureRagJob(userId: string, literatureId: string): Promise<void> {
  const doc = readLiteratureDocument(userId, literatureId);
  if (!doc) return;

  try {
    const translation = await translateLiteratureDocument(doc);
    const latest = readLiteratureDocument(userId, literatureId);
    if (!latest) return;
    writeLiteratureDocument(userId, { ...latest, translation });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "处理失败";
    const latest = readLiteratureDocument(userId, literatureId);
    if (!latest) return;
    const mode = isPredominantlyChinese(latest.body) ? "format" : "translate";
    writeLiteratureDocument(userId, {
      ...latest,
      translation: {
        status: "failed",
        translatedAt: new Date().toISOString(),
        zhBody: "",
        zhChunks: [],
        error: msg,
        mode,
      },
    });
  }
}

export { isPredominantlyChinese };
