import type OpenAI from "openai";
import {
  isSuspiciousImageSearchTerm,
  isValidImageSearchCommonName,
} from "@/lib/species-image-search-context";

const SYSTEM = `你是动物英译助手。把中文动物名译成英文俗名（common name），供 Unsplash 搜野生动物照片。

规则：
- 只输出一行英文俗名，不要中文、不要解释、不要括号、不要拉丁学名。
- 必须输出真实存在的、可区分物种的英文常用名；禁止输出属级泛称（如 big cat、small mammal、marsupial）。
- 禁止把汉字逐字译成英文（如「土豚」绝不是 ground）。
- 有学名时，俗名须与该学名指同一物种；学名含亚种时须体现亚种或地域特征（如 Panthera tigris altaica → Siberian tiger）。
- 袋熊是 wombat（Vombatus 等），考拉是 koala（Phascolarctos），二者不可混淆。`;

/** 属级/类群级泛称，不能作为物种搜图词 */
const GENUS_LEVEL_GENERIC =
  /\b(big cat|small cat|wild cat|big cats|marsupial|rodent|primate|ungulate|canid|felid|ursid|mammal|bird|fish|reptile|amphibian|animal)\b/i;

/** reportSearchQuery 里常见的学术主题词，不能当作 Unsplash 搜图词 */
const REPORT_ACADEMIC_WORD =
  /^(ecology|behavior|behaviour|conservation|habitat|distribution|reproduction|migration|population|taxonomy|genetics|anatomy|physiology|diet|feeding|breeding|wildlife|research|study|review|notes?|survey|overview|meta|analysis)$/i;

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

export function parseEnglishImageSearchName(raw: string): string | null {
  for (const candidate of englishCandidatesFromRaw(raw)) {
    if (
      isValidImageSearchCommonName(candidate) &&
      !isSuspiciousImageSearchTerm(candidate) &&
      !isGenusLevelGenericName(candidate)
    ) {
      return candidate;
    }
  }
  return null;
}

function isGenusLevelGenericName(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  if (GENUS_LEVEL_GENERIC.test(t)) return true;
  return false;
}

function genusFromBinomial(sci: string): string | null {
  const m = sci.trim().match(/^([A-Z][a-z]+)/);
  return m?.[1] ?? null;
}

/** 英文俗名与学名属是否明显冲突（如 Vombatus + koala） */
function englishConflictsWithScientificName(en: string, sci: string): boolean {
  const genus = genusFromBinomial(sci);
  if (!genus) return false;

  const enLower = en.trim().toLowerCase();
  const genusLower = genus.toLowerCase();

  if (genusLower.startsWith("vombat") || genusLower === "lasiorhinus") {
    return enLower.includes("koala");
  }
  if (genusLower.startsWith("phascolarct")) {
    return enLower.includes("wombat");
  }
  if (genusLower === "panthera") {
    return /\b(big cat|wild cat)\b/i.test(en);
  }

  const enStem = enLower.replace(/[^a-z]/g, "");
  const genusStem = genusLower.slice(0, Math.min(5, genusLower.length));
  if (enStem.length >= 4 && genusStem.length >= 4) {
    if (enStem.includes(genusStem) || genusStem.includes(enStem.slice(0, 4))) {
      return false;
    }
  }

  return false;
}

/** 校验译名是否可用于搜图 */
export function isTranslationAcceptable(
  nameZh: string,
  en: string,
  scientificName?: string | null,
): boolean {
  void nameZh;
  const t = en.trim();
  if (!isValidImageSearchCommonName(t)) return false;
  if (isSuspiciousImageSearchTerm(t)) return false;
  if (isGenusLevelGenericName(t)) return false;
  if (scientificName?.trim() && englishConflictsWithScientificName(t, scientificName)) {
    return false;
  }
  return true;
}

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
      !isSuspiciousImageSearchTerm(en) &&
      !isGenusLevelGenericName(en)
    ) {
      return en;
    }
  }
  return null;
}

/** @deprecated 不再使用属级英译表 */
export function enFromScientificName(): string | null {
  return null;
}

/** @deprecated 不再使用属级英译表 */
export function commonNameFromScientificHint(hint: string): string | null {
  void hint;
  return null;
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
  baiduEnglishHint?: string | null,
  strict = false,
): string {
  const sci = scientificNameHint?.trim();
  const baiduBlock = baiduEnglishHint?.trim()
    ? strict
      ? `\n【百度百科英文名称】${baiduEnglishHint}（须与此一致或等价）`
      : `\n百度百科英文名称：${baiduEnglishHint}`
    : "";
  const sciBlock = sci
    ? strict
      ? `\n【学名】${sci}\n该学名对应的英文俗名（只输出俗名）：${baiduBlock}`
      : `\n学名参考：${sci}${baiduBlock}`
    : baiduBlock;
  return `中文动物名：${nameZh}${sciBlock}\n英文俗名：`;
}

const RETRY_PLAIN =
  "\n只输出一行英文俗名，不要其他文字。禁止逐字翻译汉字，禁止属级泛称（如 big cat），必须是真实动物英文名。";

async function translateWithLlm(
  client: OpenAI,
  model: string,
  nameZh: string,
  scientificNameHint?: string | null,
  baiduEnglishHint?: string | null,
): Promise<string | null> {
  const sci = scientificNameHint?.trim() || null;
  const baseUser = buildTranslateUserPrompt(nameZh, sci, baiduEnglishHint, false);

  let raw = await callLlm(client, model, baseUser);
  let en = raw ? parseEnglishImageSearchName(raw) : null;
  if (en && !isTranslationAcceptable(nameZh, en, sci)) en = null;

  if (!en) {
    const retryUser = sci
      ? buildTranslateUserPrompt(nameZh, sci, baiduEnglishHint, true)
      : baseUser + RETRY_PLAIN;
    raw = await callLlm(client, model, retryUser);
    en = raw ? parseEnglishImageSearchName(raw) : null;
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
  const baiduEn = opts.englishCommonNameHint?.trim() || null;

  if (baiduEn) {
    const parsed = parseEnglishImageSearchName(baiduEn);
    if (parsed && isTranslationAcceptable(nameZh, parsed, sci)) {
      if (process.env.UNSPLASH_DEBUG === "1") {
        console.warn("[species-image] baidu english name", nameZh, "->", parsed);
      }
      return parsed;
    }
  }

  if (process.env.SPECIES_IMAGE_NAME_LLM === "0") {
    return baiduEn ? parseEnglishImageSearchName(baiduEn) : null;
  }

  try {
    const en = await translateWithLlm(client, model, nameZh, sci, baiduEn);
    if (en) return en;
  } catch (e) {
    if (process.env.UNSPLASH_DEBUG === "1") {
      console.warn("[species-image] LLM translate error", nameZh, e);
    }
  }

  return baiduEn ? parseEnglishImageSearchName(baiduEn) : null;
}

/**
 * 图鉴生成后的最终搜图英译。
 * 优先百度百科英文名称，其次 LLM；reportSearchQuery 仅供学术检索。
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
  const baiduEn = opts.englishCommonNameHint?.trim() || null;

  if (baiduEn) {
    const parsed = parseEnglishImageSearchName(baiduEn);
    if (parsed && isTranslationAcceptable(nameZh, parsed, sci)) {
      if (process.env.UNSPLASH_DEBUG === "1") {
        console.warn("[species-image] resolved translate", nameZh, "->", parsed, "(baidu)");
      }
      return parsed;
    }
  }

  const llm = await translateSpeciesNameForImageSearch(client, model, {
    nameZh,
    scientificNameHint: sci,
    englishCommonNameHint: baiduEn,
  });
  if (llm && isTranslationAcceptable(nameZh, llm, sci)) return llm;

  if (opts.preliminaryEn?.trim()) {
    const pre = opts.preliminaryEn.trim();
    if (isTranslationAcceptable(nameZh, pre, sci)) return pre;
  }

  if (opts.reportSearchQuery) {
    const fromReport = extractEnglishFromReportQuery(opts.reportSearchQuery);
    if (fromReport && isTranslationAcceptable(nameZh, fromReport, sci)) return fromReport;
  }

  return baiduEn ? parseEnglishImageSearchName(baiduEn) : null;
}
