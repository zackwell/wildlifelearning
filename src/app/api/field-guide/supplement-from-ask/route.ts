import OpenAI from "openai";
import { NextResponse } from "next/server";
import type { ExploreSpeciesPayload } from "@/lib/explore-species";
import { extractJsonObject } from "@/lib/explore-species";
import {
  buildFieldGuideCategoryIndex,
  parseSupplementMergePlan,
} from "@/lib/field-guide-supplement";

export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
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

const SYSTEM = `你是野生动物个人图鉴的编辑助手。用户有一条智能问答，需要把回答整理后并入该物种图鉴条目。

图鉴内置栏目（targetField 只能取下列之一）：
- bodyStructureMarkdown：身体结构与器官（形态、解剖适应等）
- habitsMarkdown：习性与行为（节律、社群、繁殖行为等）
- funFactsMarkdown：趣闻与冷知识
- bodyMarkdown：概览正文（分布、识别、保护等综合叙述）
- summary：摘要（仅当内容极短且适合摘要时）
- newSection：没有任何合适内置栏目时，新建「自定义分类」

规则：
1. 只输出一个 JSON 对象，不要代码围栏，不要前后解释。
2. 键：targetField, subsectionTitle, mergedContent, categoryLabel
   - subsectionTitle：若并入某栏目下已有 ## 子标题，填该子标题文字（不要带 #）；若需在该栏目下新建 ## 子标题则填新标题；targetField 为 newSection 时填新自定义分类名称；若直接追加到栏目末尾且用自动小节名，可填 null
   - mergedContent：整理后的中文 Markdown 正文（可含 ###，不要重复物种名大标题），条理清晰、与问答一致、不编造数据
   - categoryLabel：给用户看的分类说明，如「习性与行为」或自定义分类名
3. 优先并入已有子分类；内容跨类时选最主要的一类。
4. 若某内置栏目当前为空，可直接作为该栏目首段写入；也可使用 newSection 新建分类。不要因为栏目为空而拒绝输出方案。
5. 不要输出兽医诊断或急救处方。`;

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!allowRate(ip)) {
    return NextResponse.json({ error: "请求过于频繁，请稍后再试。" }, { status: 429 });
  }

  let body: {
    species?: ExploreSpeciesPayload;
    question?: string;
    answer?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON 请求体。" }, { status: 400 });
  }

  const species = body.species;
  const question = (body.question ?? "").trim();
  const answer = (body.answer ?? "").trim();

  if (!species || typeof species !== "object" || !species.slug || !species.name) {
    return NextResponse.json({ error: "缺少有效图鉴物种数据。" }, { status: 400 });
  }
  if (!question || question.length > 800) {
    return NextResponse.json({ error: "问题无效。" }, { status: 400 });
  }
  if (!answer || answer.length > 12000) {
    return NextResponse.json({ error: "回答无效。" }, { status: 400 });
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "未配置语言模型密钥（OPENAI_API_KEY 或 OLLAMA_API_KEY）。" },
      { status: 503 },
    );
  }

  const baseURL = resolveBaseUrl();
  const chatModel = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
  const categoryIndex = buildFieldGuideCategoryIndex(species);

  const client = new OpenAI({ apiKey, baseURL: baseURL || undefined });

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: chatModel,
      temperature: 0.25,
      max_tokens: 2048,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `物种：${species.name}（${species.scientificName}，slug: ${species.slug}）

当前图鉴分类与子分类索引：
${categoryIndex}

用户问题：
${question}

智能助手回答（待整理并入）：
${answer}

请输出并入方案 JSON。`,
        },
      ],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "模型请求失败";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const text = completion.choices[0]?.message?.content ?? "";
  if (!text.trim()) {
    return NextResponse.json({ error: "模型未返回内容。" }, { status: 502 });
  }

  let parsed: unknown;
  try {
    parsed = extractJsonObject(text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "无法解析模型 JSON";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const plan = parseSupplementMergePlan(parsed);
  if (!plan) {
    return NextResponse.json({ error: "模型返回的并入方案格式无效，请重试。" }, { status: 502 });
  }

  return NextResponse.json({ plan });
}
