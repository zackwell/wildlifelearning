/**
 * 将探索图鉴 taxon 字段统一为「中文类群名（拉丁对照）」格式。
 * 模型常输出「纲 Mammalia」或「鸟纲（Aves）；鸵形目（…）」等，此处做后处理。
 */

const TAXON_LATIN_TO_ZH: Record<string, string> = {
  Animalia: "动物界",
  Chordata: "脊索动物门",
  Vertebrata: "脊椎动物亚门",
  Mammalia: "哺乳纲",
  Aves: "鸟纲",
  Reptilia: "爬行纲",
  Amphibia: "两栖纲",
  Actinopterygii: "辐鳍鱼纲",
  Chondrichthyes: "软骨鱼纲",
  Insecta: "昆虫纲",
  Arachnida: "蛛形纲",
  Perissodactyla: "奇蹄目",
  Artiodactyla: "偶蹄目",
  Carnivora: "食肉目",
  Primates: "灵长目",
  Rodentia: "啮齿目",
  Chiroptera: "翼手目",
  Cetacea: "鲸目",
  Proboscidea: "长鼻目",
  Lagomorpha: "兔形目",
  Cingulata: "有甲目",
  Pilosa: "披毛目",
  Diprotodontia: "双门齿目",
  Macropodiformes: "袋鼠目",
  Passeriformes: "雀形目",
  Falconiformes: "隼形目",
  Accipitriformes: "鹰形目",
  Strigiformes: "鸮形目",
  Sphenisciformes: "企鹅目",
  Psittaciformes: "鹦鹉目",
  Piciformes: "䴕形目",
  Columbiformes: "鸽形目",
  Anseriformes: "雁形目",
  Charadriiformes: "鸻形目",
  Struthioniformes: "鸵形目",
  Squamata: "有鳞目",
  Testudines: "龟鳖目",
  Crocodilia: "鳄目",
  Rhinocerotidae: "犀科",
  Elephantidae: "象科",
  Felidae: "猫科",
  Canidae: "犬科",
  Ursidae: "熊科",
  Mustelidae: "鼬科",
  Hyaenidae: "鬣狗科",
  Equidae: "马科",
  Tapiridae: "貘科",
  Bovidae: "牛科",
  Cervidae: "鹿科",
  Suidae: "猪科",
  Camelidae: "骆驼科",
  Giraffidae: "长颈鹿科",
  Hippopotamidae: "河马科",
  Delphinidae: "海豚科",
  Balaenopteridae: "须鲸科",
  Ramphastidae: "巨嘴鸟科",
  Ramphastos: "巨嘴鸟属",
  Struthionidae: "鸵鸟科",
  Struthio: "鸵鸟属",
  "Struthio camelus": "鸵鸟",
  Ceratotherium: "白犀属",
  "Ceratotherium simum": "白犀",
  Diceros: "黑犀属",
  "Diceros bicornis": "黑犀",
  Loxodonta: "非洲象属",
  "Loxodonta africana": "非洲草原象",
  "Loxodonta cyclotis": "非洲森林象",
  Elephas: "亚洲象属",
  "Elephas maximus": "亚洲象",
  Panthera: "豹属",
  "Panthera tigris": "虎",
  "Panthera tigris altaica": "东北虎",
  "Panthera tigris amoyensis": "华南虎",
  "Panthera tigris tigris": "孟加拉虎",
  "Panthera uncia": "雪豹",
  "Panthera leo": "狮",
  Vulpes: "狐属",
  "Vulpes vulpes": "赤狐",
  Ailuropoda: "大熊猫属",
  "Ailuropoda melanoleuca": "大熊猫",
  Dasypodidae: "犰狳科",
};

const RANKS = "界|门|纲|目|科|属|种|亚种";
const RANK_SUFFIX = /(界|门|纲|目|科|属|种)$/;

function lookupZhTaxon(latin: string): string | null {
  const key = latin.trim();
  if (!key) return null;
  if (TAXON_LATIN_TO_ZH[key]) return TAXON_LATIN_TO_ZH[key];
  const binom = key.match(/^([A-Z][a-z]+)\s+([a-z]+(?:\s+[a-z]+)?)$/);
  if (binom) {
    const full = `${binom[1]} ${binom[2]}`;
    if (TAXON_LATIN_TO_ZH[full]) return TAXON_LATIN_TO_ZH[full];
    if (TAXON_LATIN_TO_ZH[binom[1]]) {
      const genusZh = TAXON_LATIN_TO_ZH[binom[1]];
      if (genusZh.endsWith("属")) return genusZh.replace(/属$/, "") || genusZh;
    }
  }
  if (TAXON_LATIN_TO_ZH[key.split(/\s+/)[0] ?? ""]) {
    return TAXON_LATIN_TO_ZH[key.split(/\s+/)[0] ?? ""];
  }
  return null;
}

function isLatinTaxonName(value: string): boolean {
  const v = value.trim();
  if (!v || /[\u4e00-\u9fff]/.test(v)) return false;
  return /^[A-Z][a-z]+(?:\s+[a-z]+)*$/.test(v);
}

function normalizeParen(s: string): string {
  return s.replace(/\s*\(\s*/g, "（").replace(/\s*\)\s*/g, "）");
}

function formatTaxonSegment(rank: string, value: string): string {
  const v = normalizeParen(value.trim().replace(/\s+/g, " "));
  if (!v) return "";

  const withParen = v.match(
    /^([\u4e00-\u9fff][\u4e00-\u9fff·A-Za-z0-9]*)\s*[（(]\s*([A-Za-z][^）)]*?)\s*[）)]\s*$/,
  );
  if (withParen) {
    return `${rank}：${withParen[1]}（${withParen[2].trim()}）`;
  }

  if (/[\u4e00-\u9fff]/.test(v)) {
    const mixed = v.match(/^([\u4e00-\u9fff][\u4e00-\u9fff·]*)\s+([A-Z][a-z].*)$/);
    if (mixed && isLatinTaxonName(mixed[2].trim())) {
      return `${rank}：${mixed[1]}（${mixed[2].trim()}）`;
    }
    return `${rank}：${v}`;
  }

  if (isLatinTaxonName(v)) {
    const zh = lookupZhTaxon(v);
    if (zh) return `${rank}：${zh}（${v}）`;
    return `${rank}：${v}`;
  }

  return `${rank}：${v}`;
}

/** 解析「鸟纲（Aves）；鸵形目（Struthioniformes）」——类群名自带纲目后缀、无「纲：」前缀 */
function parseEmbeddedRankChunks(s: string): string[] | null {
  const parts = s
    .split(/[；;，,\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;

  const segments: string[] = [];
  for (const part of parts) {
    const withParen = part.match(
      /^([\u4e00-\u9fff][\u4e00-\u9fff·]*(?:纲|目|科|属|界|门)?)\s*[（(]\s*([A-Za-z][^）)]*?)\s*[）)]\s*$/,
    );
    if (!withParen) continue;
    const name = withParen[1];
    const latin = withParen[2].trim();
    const rankM = name.match(RANK_SUFFIX);
    const rank = rankM?.[1] ?? "种";
    segments.push(`${rank}：${name}（${latin}）`);
  }
  return segments.length >= 2 ? segments : null;
}

/** 必须带冒号，避免把「鸟纲」里的「纲」误识别为阶元标签 */
function parseExplicitRankSegments(s: string): string[] {
  const re = new RegExp(
    `(?:^|[；;]\\s*)(${RANKS})\\s*[：:]\\s*([^；;]+)`,
    "g",
  );
  const segments: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(s)) !== null) {
    const formatted = formatTaxonSegment(match[1], match[2].trim());
    if (formatted) segments.push(formatted);
  }
  return segments;
}

/** 「纲 Mammalia 目 Perissodactyla」——阶元后无冒号、直接拉丁/中文 */
function parseSpacedLatinRanks(s: string): string[] {
  const re = new RegExp(
    `(?:^|[；;]\\s*)(${RANKS})\\s+(?![：:])([^；;]+?)(?=\\s*(?:${RANKS})\\s|$)`,
    "g",
  );
  const segments: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(s)) !== null) {
    const formatted = formatTaxonSegment(match[1], match[2].trim());
    if (formatted) segments.push(formatted);
  }
  return segments;
}

function countRankLabels(text: string): number {
  return (text.match(/(?:^|[；;]\s*)(?:界|门|纲|目|科|属|种)\s*[：:]/g) ?? []).length;
}

/** 统一 taxon 为「纲：哺乳纲（Mammalia）；目：…」中文为主格式。 */
export function normalizeSpeciesTaxon(raw: string): string {
  let s = normalizeParen(raw.trim());
  if (!s) return s;

  s = s
    .replace(/\bkingdom\s*[:：]?\s*/gi, "界：")
    .replace(/\bphylum\s*[:：]?\s*/gi, "门：")
    .replace(/\bclass\s*[:：]?\s*/gi, "纲：")
    .replace(/\border\s*[:：]?\s*/gi, "目：")
    .replace(/\bfamily\s*[:：]?\s*/gi, "科：")
    .replace(/\bgenus\s*[:：]?\s*/gi, "属：")
    .replace(/\bspecies\s*[:：]?\s*/gi, "种：")
    .replace(/[，,]\s*/g, "；");

  let segments = parseExplicitRankSegments(s);
  if (segments.length < 2) {
    const embedded = parseEmbeddedRankChunks(s);
    if (embedded) segments = embedded;
  }
  if (segments.length < 2) {
    segments = parseSpacedLatinRanks(s);
  }

  if (segments.length >= 2) {
    return segments.join("；");
  }

  if (segments.length === 1) {
    const single = segments[0]!;
    if (countRankLabels(s) <= 1 && s.length > single.length + 8) {
      return s;
    }
    return single;
  }

  if (isLatinTaxonName(s)) {
    const zh = lookupZhTaxon(s);
    if (zh) return `${zh}（${s}）`;
  }

  return s;
}

/** 从 taxon 字段提取「种」级中文名，如「种：水豚（Hydrochoerus hydrochaeris）」→ 水豚 */
export function extractChineseSpeciesNameFromTaxon(taxon: string): string | null {
  const s = taxon.trim();
  if (!s) return null;

  const speciesSegment =
    s.match(/(?:^|[；;]\s*)种\s*[：:]\s*([^；;]+)/)?.[1]?.trim() ?? null;
  if (!speciesSegment) return null;

  const zh =
    speciesSegment.match(/^([\u4e00-\u9fff（）()·]{2,16})/)?.[1]?.replace(/[（(].*$/, "").trim() ??
    null;
  if (zh && zh.length >= 2) return zh;

  return null;
}
