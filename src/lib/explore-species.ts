import { jsonrepair } from "jsonrepair";
import { normalizeModelMarkdown } from "@/lib/normalize-model-markdown";
import { normalizeSpeciesTaxon } from "@/lib/species-taxon-normalize";
import type { SpeciesWikiAnchor } from "@/lib/species-wiki-anchor";

export type FieldGuideQuizItem = {
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
};

export type ExploreSpeciesPayload = {
  slug: string;
  name: string;
  scientificName: string;
  taxon: string;
  habitat: string;
  diet: string;
  conservation: string;
  summary: string;
  bodyMarkdown: string;
  /** 身体结构、器官与适应特点（Markdown，可含小标题） */
  bodyStructureMarkdown: string;
  /** 习性、节律、行为等（Markdown） */
  habitsMarkdown: string;
  /** 趣闻与冷知识；无可靠趣闻时写「暂无公认的冷知识条目」等说明性一句即可 */
  funFactsMarkdown: string;
  /** 用于学术检索的英文或中英混合关键词短语，勿编造具体论文标题 */
  reportSearchQuery: string;
  /** 保存后用于「学习检测」；若模型未按格式输出则为 undefined */
  quiz?: FieldGuideQuizItem[];
  /** 首张配图 URL（与 imageUrls[0] 一致，便于旧逻辑） */
  imageUrl?: string | null;
  /** 多张配图 URL */
  imageUrls?: string[];
  /** 图片来源：unsplash，未取到图为 null */
  imageProvider?: "unsplash" | null;
  /** 本机图鉴中用户上传的配图（data URL，仅存于浏览器） */
  userUploadedImages?: string[];
  /** 图鉴封面/缩略图；须为 imageUrls 或 userUploadedImages 中的某一项 */
  coverImageUrl?: string | null;
  /** 智能助手补充的自定义分类（无对应内置栏目时新建） */
  supplementSections?: Array<{ title: string; bodyMarkdown: string }>;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function parseQuiz(raw: unknown): FieldGuideQuizItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: FieldGuideQuizItem[] = [];
  for (const el of raw) {
    if (out.length >= 3) break;
    if (!el || typeof el !== "object") continue;
    const o = el as Record<string, unknown>;
    const question = normalizeModelMarkdown(typeof o.question === "string" ? o.question : "");
    const opts = o.options;
    const ci = o.correctIndex;
    if (question.length < 2 || !Array.isArray(opts) || opts.length !== 4) continue;
    const options = opts.map((x) => normalizeModelMarkdown(String(x)).trim()) as [
      string,
      string,
      string,
      string,
    ];
    if (options.some((s) => s.length === 0)) continue;
    const idx = Number(ci);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) continue;
    out.push({ question, options, correctIndex: idx as 0 | 1 | 2 | 3 });
  }
  return out.length === 3 ? out : undefined;
}

function countMdH2(md: string): number {
  return (md.match(/^## .+$/gm) ?? []).length;
}

function countMdH2OrH3(md: string): number {
  return (md.match(/^#{2,3} .+$/gm) ?? []).length;
}

/**
 * 默认：轻量底线，避免空壳；资料少时允许短文。
 * detailLevel=baidu_enriched：百科正文较充分时，要求更详实的图鉴结构（无需环境变量）。
 * EXPLORE_SPECIES_STRICT_DETAIL=1：启用原先的「详图鉴」硬性篇幅（可选）。
 * EXPLORE_SPECIES_RELAX_DETAIL=1：跳过一切篇幅校验（与 STRICT 同时存在时以 RELAX 为准）。
 */
export type ExploreSpeciesDetailLevel = "default" | "baidu_enriched";

function meetsBaiduEnrichedDetailBar(p: ExploreSpeciesPayload): boolean {
  if (p.summary.length < 80) return false;
  if (p.taxon.length < 24) return false;
  const taxonRanks = (p.taxon.match(/(界|门|纲|目|科|属|种)\s*[：:]/g) ?? []).length;
  if (taxonRanks < 4) return false;
  if (p.habitat.length < 40) return false;
  if (p.diet.length < 40) return false;
  if (p.conservation.length < 16) return false;
  if (p.bodyMarkdown.length < 550) return false;
  if (countMdH2(p.bodyMarkdown) < 3) return false;
  if (p.bodyStructureMarkdown.length < 180) return false;
  if (countMdH2OrH3(p.bodyStructureMarkdown) < 2) return false;
  if (p.habitsMarkdown.length < 180) return false;
  if (countMdH2OrH3(p.habitsMarkdown) < 2) return false;
  if (p.funFactsMarkdown.length < 60) return false;
  return true;
}

function meetsDetailBar(
  p: ExploreSpeciesPayload,
  detailLevel: ExploreSpeciesDetailLevel = "default",
): boolean {
  if (process.env.EXPLORE_SPECIES_RELAX_DETAIL === "1") return true;

  if (process.env.EXPLORE_SPECIES_STRICT_DETAIL === "1") {
    if (p.summary.length < 120) return false;
    if (p.taxon.length < 24) return false;
    if (p.habitat.length < 50) return false;
    if (p.diet.length < 50) return false;
    if (p.conservation.length < 20) return false;
    if (p.bodyMarkdown.length < 900) return false;
    if (!p.bodyMarkdown.includes("物种特点与识别要点")) return false;
    if (countMdH2(p.bodyMarkdown) < 6) return false;
    if (p.bodyStructureMarkdown.length < 520) return false;
    if (countMdH2OrH3(p.bodyStructureMarkdown) < 4) return false;
    if (p.habitsMarkdown.length < 520) return false;
    if (countMdH2OrH3(p.habitsMarkdown) < 3) return false;
    if (p.funFactsMarkdown.length < 220) return false;
    return true;
  }

  if (detailLevel === "baidu_enriched") {
    return meetsBaiduEnrichedDetailBar(p);
  }

  if (p.summary.length < 30) return false;
  if (p.taxon.length < 6) return false;
  const taxonRanks = (p.taxon.match(/(界|门|纲|目|科|属|种)\s*[：:]/g) ?? []).length;
  if (taxonRanks < 2 && !/(纲|目|科|属).*[（(][A-Za-z]/.test(p.taxon)) return false;
  if (p.habitat.length < 12) return false;
  if (p.diet.length < 12) return false;
  if (p.conservation.length < 6) return false;
  if (p.bodyMarkdown.length < 100) return false;
  if (p.bodyStructureMarkdown.length < 50) return false;
  if (p.habitsMarkdown.length < 50) return false;
  if (p.funFactsMarkdown.length < 20) return false;
  /* 正文很短时至少要有两个一级标题，否则易是一坨无结构文字 */
  if (p.bodyMarkdown.length < 350 && countMdH2(p.bodyMarkdown) < 2) return false;
  return true;
}

function slugifyExploreSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function deriveExploreSlug(slugRaw: unknown, scientificName: string): string | null {
  const fromModel =
    typeof slugRaw === "string" ? slugifyExploreSegment(slugRaw) : "";
  if (fromModel.length >= 2) return fromModel;

  const fromSci = slugifyExploreSegment(
    scientificName.trim().replace(/\s+/g, "-"),
  );
  if (fromSci.length >= 2) return fromSci;

  return null;
}

export function parseExploreSpeciesJson(
  raw: unknown,
  opts?: { detailLevel?: ExploreSpeciesDetailLevel },
): ExploreSpeciesPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const fields = [
    "name",
    "scientificName",
    "taxon",
    "habitat",
    "diet",
    "conservation",
    "summary",
    "bodyMarkdown",
    "bodyStructureMarkdown",
    "habitsMarkdown",
    "funFactsMarkdown",
    "reportSearchQuery",
  ] as const;

  for (const k of fields) {
    if (!isNonEmptyString(o[k])) return null;
  }

  const slug = deriveExploreSlug(o.slug, String(o.scientificName));
  if (!slug) return null;

  const payload: ExploreSpeciesPayload = {
    slug,
    name: String(o.name).trim(),
    scientificName: String(o.scientificName).trim(),
    taxon: normalizeSpeciesTaxon(normalizeModelMarkdown(String(o.taxon))).slice(0, 400),
    habitat: normalizeModelMarkdown(String(o.habitat)).slice(0, 4000),
    diet: normalizeModelMarkdown(String(o.diet)).slice(0, 4000),
    conservation: normalizeModelMarkdown(String(o.conservation)).slice(0, 4000),
    summary: normalizeModelMarkdown(String(o.summary)).slice(0, 2000),
    bodyMarkdown: normalizeModelMarkdown(String(o.bodyMarkdown)).slice(0, 28000),
    bodyStructureMarkdown: normalizeModelMarkdown(String(o.bodyStructureMarkdown)).slice(0, 18000),
    habitsMarkdown: normalizeModelMarkdown(String(o.habitsMarkdown)).slice(0, 18000),
    funFactsMarkdown: normalizeModelMarkdown(String(o.funFactsMarkdown)).slice(0, 12000),
    reportSearchQuery: String(o.reportSearchQuery).trim().slice(0, 280),
    quiz: parseQuiz(o.quiz),
  };

  if (!meetsDetailBar(payload, opts?.detailLevel ?? "default")) {
    return null;
  }

  return payload;
}

/**
 * 强制图鉴「显示名」与用户输入一致（保留生僻字/异体字），并在模型擅自换成其他物种时加注说明。
 */
export function enforceUserQuerySpeciesName(
  payload: ExploreSpeciesPayload,
  userQuery: string,
  anchor: SpeciesWikiAnchor | null,
): ExploreSpeciesPayload {
  const q = userQuery.trim();
  if (!q) return payload;

  const modelName = payload.name.trim();
  if (modelName === q) return payload;

  const likelySubstitution =
    modelName.length > 0 &&
    modelName !== q &&
    !modelName.includes(q) &&
    !q.includes(modelName);

  let summary = payload.summary;
  if (likelySubstitution) {
    summary =
      `【说明】您搜索的是「${q}」。初稿中的名称「${modelName}」与输入不一致，已改回您输入的字形；若正文仍描述其他动物，请核对异体字或重试。\n\n${summary}`;
  } else {
    summary = `【说明】显示名已统一为您输入的「${q}」。\n\n${summary}`;
  }

  let scientificName = payload.scientificName;
  if (likelySubstitution && anchor?.scientificNameHint) {
    scientificName = anchor.scientificNameHint;
  }

  let reportSearchQuery = payload.reportSearchQuery;
  if (anchor?.scientificNameHint && !reportSearchQuery.includes(anchor.scientificNameHint.split(" ")[0] ?? "")) {
    reportSearchQuery = `${anchor.scientificNameHint} ${q}`.trim().slice(0, 280);
  }

  return {
    ...payload,
    name: q,
    summary,
    scientificName,
    reportSearchQuery,
  };
}

/** 去掉模型偶发包裹的思考块、前缀等 */
function stripOuterNoise(s: string): string {
  let t = s.trim();
  t = t.replace(/<think>[\s\S]*?<\/think>/gi, "");
  t = t.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "");
  t = t.replace(/^json\s*/i, "");
  return t.trim();
}

/**
 * 从首个 `{` 起按字符串规则配对花括号，避免正文里含 `}` 时用 lastIndexOf 截断错误。
 */
function findBalancedJsonSlice(s: string): string | null {
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i]!;
    if (esc) {
      esc = false;
      continue;
    }
    if (inStr) {
      if (ch === "\\") {
        esc = true;
        continue;
      }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

function tryParseJsonCandidate(raw: string): unknown {
  const t = raw.trim();
  try {
    return JSON.parse(t) as unknown;
  } catch {
    try {
      const repaired = jsonrepair(t);
      return JSON.parse(repaired) as unknown;
    } catch (e2) {
      throw e2;
    }
  }
}

export function extractJsonObject(text: string): unknown {
  let t = stripOuterNoise(text);
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) t = fenced[1]!.trim();

  const candidates: string[] = [];
  const balanced = findBalancedJsonSlice(t);
  if (balanced) candidates.push(balanced);
  candidates.push(t);
  const lo = t.indexOf("{");
  const hi = t.lastIndexOf("}");
  if (lo >= 0 && hi > lo) {
    const slice = t.slice(lo, hi + 1);
    if (!candidates.includes(slice)) candidates.push(slice);
  }

  let lastErr: unknown;
  for (const cand of candidates) {
    try {
      return tryParseJsonCandidate(cand);
    } catch (e) {
      lastErr = e;
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(`无法解析 JSON（${msg}）。若模型输出被截断，请换用更大输出上限的模型或略降低详度要求。`);
}
