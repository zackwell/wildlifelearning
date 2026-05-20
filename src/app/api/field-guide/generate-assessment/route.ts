import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  buildSpeciesAssessmentContext,
  parseAssessmentFromLlmText,
} from "@/lib/field-guide-assessment";
import type { ExploreSpeciesPayload } from "@/lib/explore-species";

export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
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

const SYSTEM = `你是野生动物图鉴学习测评出题专家。根据用户提供的图鉴正文，生成一次「全面学习检测」试卷 JSON。

要求：
1. 只输出一个 JSON 对象，不要 Markdown 围栏，不要前后解释。
2. 题目须覆盖：分类与识别、形态适应、习性、分布/保护、易混种辨析、思维发散。
3. 题型必须三类都有：
   - choice：四选一，含 question、options（长度4）、correctIndex（0-3）、points、explanation
   - true_false：判断题，含 question、correctTrueFalse（boolean）、points、explanation
   - multi_select：思维发散不定项多选（用户勾选即可，不要简答），含 question、multiOptions（5-6 个选项）、correctIndices（正确选项下标数组，2-4 个）、points、explanation。题干常用「以下哪些推断/关联/做法合理？」
4. 题量：choice 6-8 道，true_false 3-4 道，multi_select 2-3 道，共 11-15 道。
5. 每题 points 建议：choice 5，true_false 4，multi_select 6-8；总分约 80-100。
6. 题目与解析必须基于图鉴内容，不要编造图鉴未提及的具体数据。
7. explanation 写清楚为什么对错、相关知识点。
8. gradingStandard 含 summary（考核说明）与 tiers 数组（至少4档）：
   [{"label":"优秀","minPercent":90,"description":"…"},{"label":"良好","minPercent":75,"description":"…"},{"label":"及格","minPercent":60,"description":"…"},{"label":"待加强","minPercent":0,"description":"…"}]

JSON 结构：
{
  "title": "学习检测 · 物种名",
  "speciesName": "物种名",
  "questions": [ { "id":"c1", "type":"choice", ... }, ... ],
  "gradingStandard": { "summary": "…", "tiers": [ ... ] }
}`;

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (!allowRate(ip)) {
      return NextResponse.json({ error: "请求过于频繁，请稍后再试。" }, { status: 429 });
    }

    let body: { species?: ExploreSpeciesPayload };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "无效的 JSON 请求体。" }, { status: 400 });
    }

    const species = body.species;
    if (!species?.name?.trim() || !species.bodyMarkdown?.trim()) {
      return NextResponse.json({ error: "缺少图鉴内容，无法出题。" }, { status: 400 });
    }

    const apiKey = resolveApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "未配置语言模型密钥（OPENAI_API_KEY 或 OLLAMA_API_KEY）。" },
        { status: 503 },
      );
    }

    const client = new OpenAI({
      apiKey,
      baseURL: resolveBaseUrl() || undefined,
    });
    const model = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

    const context = buildSpeciesAssessmentContext(species);
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.35,
      max_tokens: 8192,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `请为以下图鉴出题：\n\n${context}\n\nspeciesName 填「${species.name.trim()}」。`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      return NextResponse.json({ error: "模型未返回内容。" }, { status: 502 });
    }

    let paper = parseAssessmentFromLlmText(raw);
    if (!paper) {
      const retry = await client.chat.completions.create({
        model,
        temperature: 0.2,
        max_tokens: 8192,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `上次输出格式不合格。请重新输出完整 JSON，必须含 choice、true_false、multi_select 三类题目；思维发散题用 multi_select 多选，不要 open 简答。\n\n${context}`,
          },
        ],
      });
      const retryRaw = retry.choices[0]?.message?.content?.trim();
      if (retryRaw) paper = parseAssessmentFromLlmText(retryRaw);
    }

    if (!paper) {
      return NextResponse.json(
        { error: "模型返回的试卷格式未通过校验，请重试。" },
        { status: 502 },
      );
    }

    return NextResponse.json({ paper });
  } catch (e) {
    console.error("[generate-assessment]", e);
    const msg = e instanceof Error ? e.message : "服务器内部错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
