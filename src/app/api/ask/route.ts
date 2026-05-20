import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { retrieveChunks, toCitations } from "@/lib/rag/retrieve";
import { getUserEnabledLiteratureIds } from "@/lib/user-data/literature-meta-server";
import { readLegacyLiteratureDocument } from "@/lib/literature/server-store";

export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const buckets = new Map<string, number[]>();

function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function allowRate(ip: string): boolean {
  const now = Date.now();
  const arr = (buckets.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) return false;
  arr.push(now);
  buckets.set(ip, arr);
  return true;
}

/** 仅依据提供的摘录（关闭混合时） */
const SYSTEM_RAG_STRICT = `你是野生动物科普助手。只能依据用户消息中提供的「参考资料摘录」作答。
若摘录不足以回答，请明确说明。
不要给出兽医诊断或野外急救处方。回答使用简体中文，条理清晰；可使用 Markdown（含表格）。`;

/** 摘录优先，可标注通识补充 */
const SYSTEM_RAG_HYBRID = `你是野生动物科普助手。用户消息中的「参考资料摘录」为**优先与主要**依据，请先基于摘录作答。
若摘录足以回答问题，不要添加与摘录矛盾的内容。
若摘录不足以完整回答，可用通识性、教科书级生物学知识作**简短**补充；补充内容必须放在单独小节，小标题固定为「（通识补充）」，以便与摘录区分。
不要编造冷门数据与不确定数字。不要给出兽医诊断或野外急救处方。回答使用简体中文，条理清晰；可使用 Markdown（含表格）。`;

/** 未命中任何摘录时的通识回答 */
const SYSTEM_GENERAL_ONLY = `你是野生动物科普助手。当前**没有**匹配到可直接引用的资料摘录。
请基于通识性、教科书级可靠知识回答用户问题，避免编造冷门数据与不确定数字。
回答开头第一段必须明确写出：「以下为通识性科普说明，非资料原文摘录，请谨慎参考。」随后再给出正文。
不要给出兽医诊断或野外急救处方。回答使用简体中文，条理清晰；可使用 Markdown（含表格）。`;

function isRagHybridEnabled(): boolean {
  const v = process.env.RAG_HYBRID?.trim().toLowerCase();
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  return true;
}

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

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!allowRate(ip)) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试。" },
      { status: 429 },
    );
  }

  let body: { question?: string; literatureIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON 请求体。" }, { status: 400 });
  }

  const question = (body.question ?? "").trim();
  let literatureIds = Array.isArray(body.literatureIds)
    ? body.literatureIds.filter((x) => typeof x === "string" && x.length > 0).slice(0, 30)
    : [];
  if (!question || question.length > 800) {
    return NextResponse.json(
      { error: "请输入 1–800 字以内的问题。" },
      { status: 400 },
    );
  }

  const sessionUser = await getSessionUser();
  if (sessionUser) {
    const allowed = new Set(await getUserEnabledLiteratureIds(sessionUser.id));
    literatureIds = literatureIds.filter((id) => allowed.has(id));
  } else {
    literatureIds = literatureIds.filter((id) => readLegacyLiteratureDocument(id) !== null);
  }

  const apiKey = resolveApiKey();
  const baseURL = resolveBaseUrl();
  const embedModel = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  const chatModel = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

  let queryEmbedding: number[] | null = null;
  if (apiKey) {
    const client = new OpenAI({ apiKey, baseURL: baseURL || undefined });
    try {
      const emb = await client.embeddings.create({
        model: embedModel,
        input: question,
      });
      queryEmbedding = emb.data[0]?.embedding as number[];
    } catch {
      queryEmbedding = null;
    }
  }

  const hits = retrieveChunks({
    query: question,
    topK: 6,
    queryEmbedding,
    literatureIds,
    userId: sessionUser?.id,
  });

  const citations = toCitations(hits);
  const hybrid = isRagHybridEnabled();

  if (!hits.length) {
    if (!apiKey || !hybrid) {
      return NextResponse.json({
        answer:
          "暂未找到与您问题直接相关的资料摘录。可尝试更换关键词，或在「知识专题」上传文献后再提问。",
        citations: [],
        mode: "empty",
      });
    }

    const client = new OpenAI({ apiKey, baseURL: baseURL || undefined });
    try {
      const completion = await client.chat.completions.create({
        model: chatModel,
        temperature: 0.35,
        messages: [
          { role: "system", content: SYSTEM_GENERAL_ONLY },
          { role: "user", content: `用户问题：${question}` },
        ],
      });
      const answer = completion.choices[0]?.message?.content?.trim();
      return NextResponse.json({
        answer: answer ?? "模型未返回内容。",
        citations: [],
        mode: "general-only",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "模型调用失败";
      return NextResponse.json({
        answer:
          `暂时无法完成回答（${msg}）。也未找到相关摘录，请稍后重试。`,
        citations: [],
        mode: "general-error",
      });
    }
  }

  const context = hits
    .map(
      (h, i) =>
        `【摘录${i + 1} | ${h.chunk.sourceTitle} | ${h.chunk.sourcePath}】\n${h.chunk.text}`,
    )
    .join("\n\n---\n\n");

  if (!apiKey) {
    const bullets = citations
      .map((c) => `• ${c.sourceTitle}（${c.sourcePath}）：${c.excerpt}`)
      .join("\n\n");
    return NextResponse.json({
      answer:
        "（当前未启用完整问答服务，以下为检索到的摘录汇总。）\n\n" +
        bullets,
      citations,
      mode: "keyword-only",
    });
  }

  const systemPrompt = hybrid ? SYSTEM_RAG_HYBRID : SYSTEM_RAG_STRICT;
  const client = new OpenAI({ apiKey, baseURL: baseURL || undefined });
  try {
    const completion = await client.chat.completions.create({
      model: chatModel,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `用户问题：${question}\n\n参考资料摘录：\n${context}`,
        },
      ],
    });
    const answer = completion.choices[0]?.message?.content?.trim();
    return NextResponse.json({
      answer: answer ?? "模型未返回内容。",
      citations,
      mode: hybrid ? "rag-hybrid" : "rag",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "模型调用失败";
    return NextResponse.json(
      {
        answer: `调用语言模型失败：${msg}。以下为检索到的摘录原文供参考。`,
        citations,
        mode: "error-fallback",
      },
      { status: 200 },
    );
  }
}
