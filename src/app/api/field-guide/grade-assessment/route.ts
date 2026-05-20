import OpenAI from "openai";
import { NextResponse } from "next/server";
import { extractJsonObject } from "@/lib/explore-species";

export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 15;
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

const SYSTEM = `你是图鉴开放题阅卷助手。根据参考答案与评分要点，评定学员简答/发散题。

只输出 JSON 数组，每项：
{"id":"题目id","earned":数字,"max":数字,"feedback":"简短评语"}

earned 为 0 到 max 之间的整数，按要点覆盖度给分：
- 覆盖主要要点且表述合理：满分
- 覆盖部分要点：约一半分
- 偏题或几乎未答：0 分

feedback 用中文，1-3 句，指出亮点与不足。`;

type GradeItem = {
  id: string;
  question: string;
  referenceAnswer: string;
  rubric: string;
  userAnswer: string;
  maxPoints: number;
};

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (!allowRate(ip)) {
      return NextResponse.json({ error: "请求过于频繁，请稍后再试。" }, { status: 429 });
    }

    let body: {
      speciesName?: string;
      items?: GradeItem[];
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "无效的 JSON 请求体。" }, { status: 400 });
    }

    const items = body.items ?? [];
    if (items.length === 0) {
      return NextResponse.json({ grades: [] });
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

    const userContent = items
      .map(
        (it, i) =>
          `【题 ${i + 1}】id=${it.id}\n问题：${it.question}\n参考答案：${it.referenceAnswer}\n评分要点：${it.rubric}\n学员作答：${it.userAnswer || "（未作答）"}\n满分：${it.maxPoints}`,
      )
      .join("\n\n");

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.15,
      max_tokens: 2048,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `物种：${body.speciesName ?? "未知"}\n\n${userContent}\n\n请输出 JSON 数组。`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      return NextResponse.json({ error: "模型未返回内容。" }, { status: 502 });
    }

    const parsed = extractJsonObject(raw);
    const list = Array.isArray(parsed) ? parsed : (parsed as { grades?: unknown }).grades;
    if (!Array.isArray(list)) {
      return NextResponse.json({ error: "阅卷结果格式无效。" }, { status: 502 });
    }

    const grades = [];
    for (const el of list) {
      if (!el || typeof el !== "object") continue;
      const o = el as Record<string, unknown>;
      const id = String(o.id ?? "").trim();
      const max = Number(o.max);
      let earned = Number(o.earned);
      const feedback = String(o.feedback ?? "").trim();
      if (!id) continue;
      const item = items.find((x) => x.id === id);
      const maxPoints = item?.maxPoints ?? (Number.isFinite(max) ? max : 10);
      if (!Number.isFinite(earned)) earned = 0;
      earned = Math.max(0, Math.min(maxPoints, Math.round(earned)));
      grades.push({
        id,
        earned,
        max: maxPoints,
        isCorrect: earned >= maxPoints * 0.6 ? true : earned > 0 ? null : false,
        feedback: feedback || "已评分。",
      });
    }

    for (const it of items) {
      if (!grades.some((g) => g.id === it.id)) {
        const empty = !it.userAnswer?.trim();
        grades.push({
          id: it.id,
          earned: 0,
          max: it.maxPoints,
          isCorrect: false,
          feedback: empty ? "未作答，得 0 分。" : "未能自动评分，请对照参考答案自评。",
        });
      }
    }

    return NextResponse.json({ grades });
  } catch (e) {
    console.error("[grade-assessment]", e);
    const msg = e instanceof Error ? e.message : "服务器内部错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
