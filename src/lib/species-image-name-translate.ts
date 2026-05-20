import type OpenAI from "openai";
import {
  isSuspiciousImageSearchTerm,
  isValidImageSearchCommonName,
} from "@/lib/species-image-search-context";

const SYSTEM = `你是动物英译助手。把中文动物名译成英文俗名（common name），供 Unsplash 搜野生动物照片。

规则：
- 只输出一行英文俗名，不要中文、不要解释、不要括号、不要拉丁学名。
- 必须输出真实存在的动物英文常用名，禁止把汉字逐字译成英文（如「土豚」绝不是 ground）。
- 有学名时，俗名须与该学名指同一物种。

易混淆（务必区分）：
- 大食蚁兽→giant anteater（Myrmecophaga，不是 aardvark）
- 小食蚁兽→southern tamandua 或 tamandua（Tamandua）
- 土豚→aardvark（Orycteropus，不是 ground）
- 穿山甲→pangolin（不是 armadillo）
- 犰狳→armadillo（不是 pangolin）

更多示例：
短尾袋鼠→potoroo
东北虎→Siberian tiger
侏鹤鸵→dwarf cassowary
金丝猴→golden snub-nosed monkey`;

/** 已知错译：中文 → 应拒绝的英文 */
const ZH_WRONG_EN: Record<string, RegExp[]> = {
  大食蚁兽: [/\baardvark\b/i, /\bpangolin\b/i, /\barmadillo\b/i],
  小食蚁兽: [/\baardvark\b/i, /\bgiant anteater\b/i],
  土豚: [/\bground\b/i, /\bearth\b/i, /\bpangolin\b/i, /\bgiant anteater\b/i],
  犰狳: [/\bpangolin\b/i, /\bscaly anteater\b/i],
  穿山甲: [/\barmadillo\b/i],
  双垂鹤鸵: [/\bostrich\b/i],
  单垂鹤鸵: [/\bostrich\b/i],
  侏鹤鸵: [/\bostrich\b/i],
  阔耳狐: [/\bred fox\b/i, /\barctic fox\b/i],
  耳廓狐: [/\bred fox\b/i, /\barctic fox\b/i],
};

/** 学名属 → 英文俗名（来自分类学，非中文对照表） */
const GENUS_TO_EN: Record<string, string> = {
  Myrmecophaga: "giant anteater",
  Tamandua: "tamandua",
  Cyclopes: "silky anteater",
  Orycteropus: "aardvark",
  Casuarius: "cassowary",
  Struthio: "ostrich",
  Vulpes: "fox",
  Potorous: "potoroo",
  Setonix: "quokka",
  Macropus: "kangaroo",
  Phascolarctos: "koala",
  Ailuropoda: "giant panda",
  Panthera: "big cat",
  Loxodonta: "African elephant",
  Elephas: "Asian elephant",
  Diceros: "black rhinoceros",
  Ceratotherium: "white rhinoceros",
  Arctictis: "binturong",
};

/** 属级期望：用于校验 LLM 是否与学名一致 */
const GENUS_EN_PATTERN: Record<string, RegExp> = {
  Myrmecophaga: /\b(giant anteater|ant bear|myrmecophaga)\b/i,
  Tamandua: /\b(tamandua|lesser anteater)\b/i,
  Cyclopes: /\b(silky anteater|pygmy anteater)\b/i,
  Orycteropus: /\baardvark\b/i,
  Arctictis: /\bbinturong\b/i,
  Ailurus: /\bred panda\b/i,
  Mustela: /\bweasel\b/i,
};

function genusFromBinomial(sci: string): string | null {
  const t = sci.trim();
  if (!t || /^未知|unknown|n\/a/i.test(t)) return null;
  const m = t.match(/^([A-Z][a-z]+)/);
  return m?.[1] ?? null;
}

function normalizeRaw(text: string): string {
  return text
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\*+/g, "")
    .replace(/^(?:英文俗名|english common name|common name)\s*[：:]\s*/i, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/[：:]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function englishCandidatesFromRaw(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (s: string) => {
    const t = normalizeRaw(s);
    if (t.length >= 2 && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      out.push(t);
    }
  };

  push(raw);
  for (const line of raw.split(/\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (!/[\u4e00-\u9fff]/.test(t)) {
      push(t);
      continue;
    }
    const afterColon = t.split(/[：:]/).pop()?.trim();
    if (afterColon && !/[\u4e00-\u9fff]/.test(afterColon)) push(afterColon);
    for (const m of t.matchAll(/[a-zA-Z][a-zA-Z\s-]{1,50}/g)) {
      push(m[0]);
    }
  }
  return out;
}

function parseCommonName(raw: string): string | null {
  for (const candidate of englishCandidatesFromRaw(raw)) {
    if (
      isValidImageSearchCommonName(candidate) &&
      !isSuspiciousImageSearchTerm(candidate)
    ) {
      return candidate;
    }
  }
  return null;
}

const SCIENTIFIC_PATTERN_TO_EN: Array<{ pattern: RegExp; en: string }> = [
  { pattern: /\bvulpes\s+zerda\b/i, en: "fennec fox" },
  { pattern: /\bcasuarius\s+unappendiculatus\b/i, en: "northern cassowary" },
  { pattern: /\bcasuarius\s+bennetti\b/i, en: "dwarf cassowary" },
  { pattern: /\bcasuarius\s+casuarius\b/i, en: "southern cassowary" },
  { pattern: /\bcanis\s+lupus\s+dingo\b/i, en: "dingo" },
  { pattern: /\bcanis\s+dingo\b/i, en: "dingo" },
  { pattern: /\barctictis\s+binturong\b/i, en: "binturong" },
];

export function enFromScientificName(scientificName: string): string | null {
  const sci = scientificName.trim();
  if (!sci || /^未知|unknown|n\/a/i.test(sci)) return null;

  const genus = genusFromBinomial(sci);
  if (genus && GENUS_TO_EN[genus]) {
    const en = GENUS_TO_EN[genus];
    if (isValidImageSearchCommonName(en) && !isSuspiciousImageSearchTerm(en)) {
      return en;
    }
  }

  for (const { pattern, en } of SCIENTIFIC_PATTERN_TO_EN) {
    if (pattern.test(sci) && isValidImageSearchCommonName(en)) return en;
  }

  return null;
}

/** @deprecated 使用 enFromScientificName */
export function commonNameFromScientificHint(hint: string): string | null {
  return enFromScientificName(hint);
}

/** reportSearchQuery 里常见的学术主题词，不能当作 Unsplash 搜图词 */
const REPORT_ACADEMIC_WORD =
  /^(ecology|behavior|behaviour|conservation|habitat|distribution|reproduction|migration|population|taxonomy|genetics|anatomy|physiology|diet|feeding|breeding|wildlife|research|study|review|notes?|survey|overview|meta|analysis)$/i;

export function extractEnglishFromReportQuery(q: string): string | null {
  const t = q.trim();
  if (!t) return null;
  const latin = t.match(/\b([A-Z][a-z]+(?:\s+[a-z]+){1,2})\b/)?.[1];
  const rest = latin ? t.replace(latin, "").trim() : t;
  const matches = [...rest.matchAll(/\b([a-z][a-z\s-]{2,40})\b/gi)];
  for (const m of matches) {
    const en = m[1]?.trim().replace(/\s+/g, " ");
    if (!en || REPORT_ACADEMIC_WORD.test(en)) continue;
    if (
      isValidImageSearchCommonName(en) &&
      !isSuspiciousImageSearchTerm(en)
    ) {
      return en;
    }
  }
  return null;
}

function isWrongTranslation(nameZh: string, en: string): boolean {
  const patterns = ZH_WRONG_EN[nameZh.trim()];
  if (!patterns?.length) return false;
  return patterns.some((p) => p.test(en.trim()));
}

function enMatchesScientificName(en: string, scientificName: string): boolean {
  const genus = genusFromBinomial(scientificName);
  if (!genus) return true;
  const pattern = GENUS_EN_PATTERN[genus];
  if (!pattern) return true;
  return pattern.test(en);
}

/** 校验译名是否可用于搜图 */
export function isTranslationAcceptable(
  nameZh: string,
  en: string,
  scientificName?: string | null,
): boolean {
  const t = en.trim();
  if (!isValidImageSearchCommonName(t)) return false;
  if (isSuspiciousImageSearchTerm(t)) return false;
  if (isWrongTranslation(nameZh, t)) return false;
  if (scientificName?.trim() && !enMatchesScientificName(t, scientificName)) {
    return false;
  }
  return true;
}

async function callLlmOnce(
  client: OpenAI,
  model: string,
  userContent: string,
): Promise<{ raw: string | null; finishReason: string | null }> {
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.05,
    max_tokens: 512,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userContent },
    ],
  });
  const choice = completion.choices[0];
  const raw = choice?.message?.content?.trim() ?? null;
  return { raw, finishReason: choice?.finish_reason ?? null };
}

async function callLlm(
  client: OpenAI,
  model: string,
  userContent: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { raw, finishReason } = await callLlmOnce(client, model, userContent);
      if (raw) return raw;
      if (process.env.UNSPLASH_DEBUG === "1") {
        console.warn("[species-image] translate empty content", { attempt, finishReason });
      }
    } catch (e) {
      if (process.env.UNSPLASH_DEBUG === "1") {
        console.warn("[species-image] translate call error", attempt, e);
      }
    }
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  return null;
}

function buildTranslateUserPrompt(
  nameZh: string,
  scientificNameHint?: string | null,
  strict = false,
): string {
  const sci = scientificNameHint?.trim();
  const sciBlock = sci
    ? strict
      ? `\n【学名】${sci}\n该学名对应的英文俗名（只输出俗名）：`
      : `\n学名参考：${sci}`
    : "";
  return `中文动物名：${nameZh}${sciBlock}\n英文俗名：`;
}

async function translateWithLlm(
  client: OpenAI,
  model: string,
  nameZh: string,
  scientificNameHint?: string | null,
): Promise<string | null> {
  const sci = scientificNameHint?.trim();
  const baseUser = buildTranslateUserPrompt(nameZh, sci, false);

  let raw = await callLlm(client, model, baseUser);
  let en = raw ? parseCommonName(raw) : null;
  if (en && !isTranslationAcceptable(nameZh, en, sci)) en = null;

  if (!en) {
    const retryUser = sci
      ? buildTranslateUserPrompt(nameZh, sci, true)
      : baseUser + RETRY_PLAIN;
    raw = await callLlm(client, model, retryUser);
    en = raw ? parseCommonName(raw) : null;
    if (en && !isTranslationAcceptable(nameZh, en, sci)) en = null;
  }

  if (process.env.UNSPLASH_DEBUG === "1") {
    console.warn(
      "[species-image] LLM translate",
      nameZh,
      sci ? `(sci=${sci})` : "",
      "->",
      en ?? "(failed/rejected)",
      raw ? `lastRaw=${JSON.stringify(raw.slice(0, 120))}` : "noRaw",
    );
  }

  return en;
}

export async function translateSpeciesNameForImageSearch(
  client: OpenAI,
  model: string,
  opts: {
    nameZh: string;
    scientificNameHint?: string | null;
    englishCommonNameHint?: string | null;
  },
): Promise<string | null> {
  const nameZh = opts.nameZh.trim();
  if (!nameZh) return null;

  const sci = opts.scientificNameHint?.trim() || null;

  const fromEnHint = opts.englishCommonNameHint?.trim();
  if (fromEnHint) {
    const parsed = parseCommonName(fromEnHint);
    if (parsed && isTranslationAcceptable(nameZh, parsed, sci)) {
      if (process.env.UNSPLASH_DEBUG === "1") {
        console.warn("[species-image] baidu/wiki english name", nameZh, "->", parsed);
      }
      return parsed;
    }
  }

  const fromSci = sci ? enFromScientificName(sci) : null;
  if (fromSci && isTranslationAcceptable(nameZh, fromSci, sci)) {
    if (process.env.UNSPLASH_DEBUG === "1") {
      console.warn("[species-image] scientific translate", nameZh, "->", fromSci);
    }
    return fromSci;
  }

  if (process.env.SPECIES_IMAGE_NAME_LLM === "0") {
    return fromSci;
  }

  try {
    const en = await translateWithLlm(client, model, nameZh, sci);
    if (en) return en;
  } catch (e) {
    if (process.env.UNSPLASH_DEBUG === "1") {
      console.warn("[species-image] LLM translate error", nameZh, e);
    }
  }

  return fromSci;
}

/**
 * 图鉴生成后的最终搜图英译。
 * 优先使用图鉴生成前已校验的 preliminaryEn（专用译名 LLM），
 * 其次学名映射；reportSearchQuery 仅供学术检索，其中主题词（ecology 等）不得用于搜图。
 */
export async function resolveImageSearchEnglish(
  client: OpenAI,
  model: string,
  opts: {
    nameZh: string;
    scientificName?: string | null;
    reportSearchQuery?: string | null;
    preliminaryEn?: string | null;
    scientificNameHint?: string | null;
    englishCommonNameHint?: string | null;
  },
): Promise<string | null> {
  const nameZh = opts.nameZh.trim();
  if (!nameZh) return null;

  const sci = (opts.scientificName || opts.scientificNameHint || "").trim() || null;

  const candidates: Array<{ en: string; source: string }> = [];

  if (opts.englishCommonNameHint?.trim()) {
    candidates.push({ en: opts.englishCommonNameHint.trim(), source: "encyclopedia" });
  }

  if (opts.preliminaryEn?.trim()) {
    candidates.push({ en: opts.preliminaryEn.trim(), source: "preliminary" });
  }

  if (sci) {
    const fromSci = enFromScientificName(sci);
    if (fromSci) candidates.push({ en: fromSci, source: "scientific" });
  }

  if (opts.reportSearchQuery) {
    const fromReport = extractEnglishFromReportQuery(opts.reportSearchQuery);
    if (fromReport) candidates.push({ en: fromReport, source: "report" });
  }

  for (const { en, source } of candidates) {
    if (isTranslationAcceptable(nameZh, en, sci)) {
      if (process.env.UNSPLASH_DEBUG === "1") {
        console.warn("[species-image] resolved translate", nameZh, "->", en, `(${source})`);
      }
      return en;
    }
    if (process.env.UNSPLASH_DEBUG === "1") {
      console.warn("[species-image] rejected translate", nameZh, en, `(${source})`);
    }
  }

  const llm = await translateSpeciesNameForImageSearch(client, model, {
    nameZh,
    scientificNameHint: sci,
    englishCommonNameHint: opts.englishCommonNameHint,
  });
  if (llm && isTranslationAcceptable(nameZh, llm, sci)) return llm;

  const fromSci = sci ? enFromScientificName(sci) : null;
  if (fromSci) return fromSci;

  return null;
}

const RETRY_PLAIN =
  "\n只输出一行英文俗名，不要其他文字。禁止逐字翻译汉字，必须是真实动物英文名。";
