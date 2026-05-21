const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const FETCH_MS = 10000;

const MAX_REFERENCE_CHARS = 9000;

/** 百度百科常见正文小节标题 */
const SECTION_HEADS = [
  "形态特征",
  "栖息环境",
  "生活习性",
  "习性",
  "食性",
  "分布范围",
  "地理分布",
  "繁殖方式",
  "生长繁殖",
  "亚种分化",
  "种群状况",
  "保护现状",
  "保护级别",
  "经济价值",
  "鉴别特征",
];

export type BaiduBaikeSection = {
  title: string;
  body: string;
};

export type BaiduBaikeSpecies = {
  title: string;
  summary: string;
  scientificName: string | null;
  englishName: string | null;
  taxonBrief: string | null;
  /** 导语多段（词条开头） */
  introParagraphs: string[];
  /** 结构化小节 */
  sections: BaiduBaikeSection[];
  /** 合并后的长参考正文，供图鉴 LLM 使用 */
  referenceBody: string;
};

function httpSignal(): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(FETCH_MS);
  }
  return undefined;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractEnglishName(text: string): string | null {
  const patterns = [
    /外文名\s*[：:]?\s*([^，,；;\n]{2,80})/,
    /英文(?:名|名称|俗名)\s*[：:]?\s*([^，,；;\n]{2,80})/,
    /英文名称\s*([A-Za-z][A-Za-z\s-]{2,40})/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m?.[1]) continue;
    const segment = m[1];
    const englishParts = [...segment.matchAll(/\b([A-Za-z][A-Za-z\s-]{2,30})\b/g)];
    for (const part of englishParts) {
      const raw = part[1]?.trim().replace(/\s+/g, " ");
      if (raw && raw.length >= 3) return raw;
    }
  }
  return null;
}

function isFamilyOrHigherTaxon(name: string): boolean {
  const token = name.trim().split(/\s+/).pop() ?? name.trim();
  return /(?:idae|inae|oidea|inae|ota|phyta|mycota)$/i.test(token);
}

function extractBinomial(text: string): string | null {
  const patterns = [
    /拉丁学名\s*[：:]?\s*([A-Z][a-z]+(?:\s+[a-z]+)?(?:\s+[a-z]+)?)/,
    /（\s*([A-Z][a-z]+\s+[a-z]+)\s*）/,
    /\(\s*([A-Z][a-z]+\s+[a-z]+)\s*\)/,
    /([A-Z][a-z]+\s+[a-z]+)\s*[（(][A-Za-z .,]+182\d/i,
  ];
  let familyLevel: string | null = null;
  for (const re of patterns) {
    const m = text.match(re);
    if (!m?.[1]) continue;
    const candidate = m[1].replace(/\s+/g, " ").trim();
    if (candidate.length < 8 || candidate.length >= 60) continue;
    if (isFamilyOrHigherTaxon(candidate)) {
      familyLevel ??= candidate;
      continue;
    }
    return candidate;
  }

  const speciesInText = [...text.matchAll(/\b([A-Z][a-z]+\s+[a-z]+)\b/g)]
    .map((m) => m[1]?.replace(/\s+/g, " ").trim())
    .filter((name): name is string => {
      if (!name || name.length < 8 || name.length >= 60) return false;
      return !isFamilyOrHigherTaxon(name);
    });
  if (speciesInText[0]) return speciesInText[0];

  return familyLevel;
}

function extractTaxonBrief(text: string): string | null {
  const inline = text.match(/是\s*([\u4e00-\u9fff]{2,8}目)\s*([\u4e00-\u9fff]{2,8}科)\s*([\u4e00-\u9fff]{2,8}属)/);
  if (inline) {
    return `目：${inline[1]}；科：${inline[2]}；属：${inline[3]}`;
  }
  return null;
}

function isNoise(s: string): boolean {
  return /百度百科|登录|注册|进入词条|全站搜索|播报|编辑|目录|有用\+|订阅|图集|参考资料/.test(
    s,
  );
}

function cleanChunk(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** 从百度百科新版 HTML 的 J-lemma-content-lemma-text 节点抽取纯文本 */
function collectLemmaSpanText(htmlSlice: string): string {
  const parts: string[] = [];
  const re =
    /<span[^>]*J-lemma-content-lemma-text[^>]*data-text="true"[^>]*>([\s\S]*?)<\/span>/gi;
  for (const m of htmlSlice.matchAll(re)) {
    let inner = m[1]!.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, "$1");
    inner = decodeEntities(stripTags(inner));
    if (inner) parts.push(inner);
  }
  if (parts.length) return parts.join("");
  return decodeEntities(stripTags(htmlSlice));
}

function extractSummaryHtmlRegion(html: string): string {
  const byClass = html.match(
    /class="[^"]*summary_[^"]*"[\s\S]*?(?=data-name="[^"]+"[^>]*><h2>|$)/i,
  );
  if (byClass?.[0]) return byClass[0];
  const idx = html.indexOf("lemma-summary");
  if (idx >= 0) return html.slice(idx, idx + 12000);
  return "";
}

function splitParagraphsFromHtml(htmlRegion: string): string[] {
  const paras: string[] = [];
  for (const m of htmlRegion.matchAll(
    /data-tag="paragraph"[\s\S]*?>([\s\S]*?)<\/div>/gi,
  )) {
    const t = cleanChunk(collectLemmaSpanText(m[1]!));
    if (t.length < 20 || isNoise(t)) continue;
    paras.push(/[。！？]$/.test(t) ? t : `${t}。`);
    if (paras.length >= 5) break;
  }
  if (!paras.length) {
    const t = cleanChunk(collectLemmaSpanText(htmlRegion));
    if (t.length >= 20 && !isNoise(t)) {
      paras.push(t.slice(0, 800));
    }
  }
  return paras;
}

function extractIntroFromHtml(html: string, title: string): string[] {
  const region = extractSummaryHtmlRegion(html);
  if (!region) return [];
  const paras = splitParagraphsFromHtml(region);
  return paras.filter((p) => p.includes(title) || paras.length > 1).slice(0, 4);
}

function extractSectionsFromHtml(html: string): BaiduBaikeSection[] {
  const matches = [...html.matchAll(/data-name="([^"]+)"[^>]*><h2>\1<\/h2>/g)];
  const sections: BaiduBaikeSection[] = [];
  for (let i = 0; i < matches.length; i++) {
    const title = matches[i]![1]!.trim();
    if (!SECTION_HEADS.includes(title)) continue;
    const start = matches[i]!.index! + matches[i]![0].length;
    const end = matches[i + 1]?.index ?? html.length;
    let body = collectLemmaSpanText(html.slice(start, end));
    body = cleanChunk(body);
    if (body.length < 30 || isNoise(body)) continue;
    sections.push({ title, body: body.slice(0, 2200) });
    if (sections.length >= 8) break;
  }
  return sections;
}

function extractMetaPlainText(html: string): string {
  const chunks = [
    collectLemmaSpanText(extractSummaryHtmlRegion(html)),
    stripTags(html.match(/J-basic-info[\s\S]{0,15000}/i)?.[0] ?? ""),
  ];
  return chunks.filter(Boolean).join("\n");
}

function extractIntroParagraphs(text: string, title: string): string[] {
  const start = text.indexOf(title);
  const slice = start >= 0 ? text.slice(start, start + 3500) : text.slice(0, 3500);
  const firstSectionIdx = SECTION_HEADS.map((h) => slice.indexOf(h)).filter((i) => i > 40);
  const cut = firstSectionIdx.length ? Math.min(...firstSectionIdx) : slice.length;
  const intro = slice.slice(0, cut);

  const paras: string[] = [];
  for (const sent of intro.split(/[。！？]/)) {
    const t = cleanChunk(sent);
    if (t.length < 20 || isNoise(t)) continue;
    if (!t.includes(title) && paras.length === 0 && !/[哺乳动物|鸟类|鱼类|爬行动物|两栖|昆虫]/.test(t)) {
      continue;
    }
    paras.push(`${t}。`);
    if (paras.length >= 4) break;
  }
  return paras;
}

function extractSections(text: string): BaiduBaikeSection[] {
  const found: Array<{ title: string; index: number }> = [];
  for (const head of SECTION_HEADS) {
    const idx = text.indexOf(head);
    if (idx >= 0) found.push({ title: head, index: idx });
  }
  found.sort((a, b) => a.index - b.index);

  const unique: typeof found = [];
  const seen = new Set<string>();
  for (const f of found) {
    if (seen.has(f.title)) continue;
    seen.add(f.title);
    unique.push(f);
  }

  const sections: BaiduBaikeSection[] = [];
  for (let i = 0; i < unique.length; i++) {
    const { title, index } = unique[i]!;
    const nextIndex = unique[i + 1]?.index ?? text.length;
    let chunk = text.slice(index + title.length, nextIndex);
    chunk = chunk.replace(/^(?:播报|编辑|\s)+/, "");
    chunk = cleanChunk(chunk);
    if (chunk.length < 30 || isNoise(chunk)) continue;
    sections.push({ title, body: chunk.slice(0, 2200) });
    if (sections.length >= 8) break;
  }
  return sections;
}

function buildReferenceBody(
  introParagraphs: string[],
  sections: BaiduBaikeSection[],
  summary: string,
): string {
  const parts: string[] = [];
  if (introParagraphs.length) {
    parts.push("【导语】", introParagraphs.join("\n"));
  } else if (summary) {
    parts.push("【导语】", summary);
  }
  for (const sec of sections) {
    parts.push(`【${sec.title}】`, sec.body);
  }
  return parts.join("\n").slice(0, MAX_REFERENCE_CHARS);
}

function extractSummary(introParagraphs: string[], title: string): string {
  if (introParagraphs[0]) return introParagraphs[0].slice(0, 600);
  return title;
}

function parseLemmaHtml(html: string, query: string): BaiduBaikeSpecies | null {
  if (html.length < 500) return null;
  if (!html.includes(query) && !html.toLowerCase().includes(query.toLowerCase())) {
    return null;
  }

  const title = query;
  const metaText = extractMetaPlainText(html);
  const fallbackText = stripTags(html);

  let introParagraphs = extractIntroFromHtml(html, title);
  let sections = extractSectionsFromHtml(html);

  if (!introParagraphs.length) {
    introParagraphs = extractIntroParagraphs(fallbackText, title);
  }
  if (!sections.length) {
    sections = extractSections(fallbackText);
  }

  const scientificName =
    extractBinomial(metaText) ??
    extractBinomial(introParagraphs.join(" ")) ??
    extractBinomial(fallbackText);
  const englishName = extractEnglishName(metaText) ?? extractEnglishName(fallbackText);
  const taxonBrief =
    extractTaxonBrief(collectLemmaSpanText(extractSummaryHtmlRegion(html))) ??
    extractTaxonBrief(fallbackText);
  const summary = extractSummary(introParagraphs, title);
  const referenceBody = buildReferenceBody(introParagraphs, sections, summary);

  if (!scientificName && summary.length < 30 && sections.length === 0) return null;

  return {
    title,
    summary,
    scientificName,
    englishName,
    taxonBrief,
    introParagraphs,
    sections,
    referenceBody,
  };
}

async function fetchLemmaHtml(keyword: string): Promise<string | null> {
  const urls = [
    `https://baike.baidu.com/item/${encodeURIComponent(keyword)}`,
    `https://baike.baidu.com/item/${encodeURIComponent(keyword.replace(/\s+/g, ""))}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "zh-CN,zh;q=0.9",
        },
        cache: "no-store",
        signal: httpSignal(),
        redirect: "follow",
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (html.length > 500) return html;
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * 从百度百科锚定物种（国内网络通常比维基更可达）。
 */
export async function resolveBaiduBaikeSpecies(query: string): Promise<BaiduBaikeSpecies | null> {
  const q = query.trim();
  if (!q || q.length > 40) return null;

  const html = await fetchLemmaHtml(q);
  if (!html) return null;

  return parseLemmaHtml(html, q);
}

/** 百度百科「本词条是一个多义词」消歧页（非具体物种条目） */
export async function isBaiduDisambiguationQuery(query: string): Promise<boolean> {
  const q = query.trim();
  if (!q || q.length > 40) return false;
  const html = await fetchLemmaHtml(q);
  if (!html) return false;
  return html.includes("本词条是一个多义词") || html.includes("请在下列义项中选择浏览");
}

export function countBaiduReferenceSections(referenceBody: string): number {
  return (referenceBody.match(/^【(?!导语)/gm) ?? []).length;
}

export function baiduReferenceIsRich(referenceBody: string): boolean {
  const len = referenceBody.trim().length;
  const sectionCount = countBaiduReferenceSections(referenceBody);
  if (len >= 800) return true;
  return len >= 500 && sectionCount >= 2;
}
