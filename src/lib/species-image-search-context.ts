/** 搜图上下文：仅承载「一个英文检索词」，由路由在调用 Unsplash 前写入。 */

const BLOCKED_EN =
  /^(status|conservation|animal|wildlife|species|mammal|bird|fish|reptile|habitat|distribution|ground|earth|soil|water|land|sky|tree|grass|unknown|none|na|n|ecology|behavior|behaviour|reproduction|migration|population|taxonomy|genetics|anatomy|physiology|diet|feeding|breeding|research|study|review|notes?)$/i;

/** 单词过于泛化、不可能是有效物种搜图词 */
const SUSPICIOUS_SINGLE =
  /^(ground|earth|soil|water|land|sky|tree|grass|rock|stone|sand|mud|leaf|plant|food|meat|wild|nature|forest|river|mountain|desert|unknown|none)$/i;

export function isSuspiciousImageSearchTerm(value: string | null | undefined): boolean {
  const t = (value ?? "").trim();
  if (!t) return true;
  if (SUSPICIOUS_SINGLE.test(t)) return true;
  if (t.split(/\s+/).length === 1 && BLOCKED_EN.test(t)) return true;
  return false;
}

export type SpeciesImageSearchContext = {
  nameZh: string;
  /** 大模型译出的英文俗名（或用户直接输入的英文） */
  searchQueryEn: string;
  scientificName: string;
  /** 分类/taxon 文本（纲目科属或百科分类概要），用于推断搜图类群 */
  taxon?: string;
};

/**
 * 拉丁学名形如 Struthio camelus；排除英文俗名如 Siberian tiger、African elephant。
 */
const COMMON_NAME_WORD =
  /\b(tiger|lion|bear|fox|wolf|elephant|rhinoceros|rhino|panda|eagle|hawk|owl|penguin|whale|dolphin|shark|snake|frog|turtle|deer|moose|seal|otter|parrot|ostrich|armadillo|leopard|cheetah|gorilla|monkey|bat|rat|mouse|cat|dog|horse|zebra|giraffe|hippo|koala|kangaroo|buffalo|bison|antelope|hyena|jackal|duck|goose|swan|crane|heron|stork|flamingo|pelican|toucan|macaw|salmon|trout|cod|tuna|octopus|squid|crab|lobster|butterfly|bee|ant|spider|gecko|lizard|crocodile|alligator|tortoise|red|black|white|blue|green|giant|dwarf|lesser|greater|common|african|asian|siberian|bengal|indian|american|european|australian|arctic|southern|northern|mountain|sea|river|forest|desert|golden|snow|flying|tree|ground|spotted|striped)\b/i;

export function isLikelyScientificName(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (COMMON_NAME_WORD.test(t)) return false;
  if (/^[A-Z][a-z]+(?:\s+[a-z]+){1,2}$/.test(t)) return true;
  return false;
}

export function isValidImageSearchEn(value: string | null | undefined): value is string {
  const t = (value ?? "").trim();
  if (t.length < 2 || t.length > 80) return false;
  if (/[\u4e00-\u9fff]/.test(t)) return false;
  if (!/^[a-zA-Z][a-zA-Z\s-]+$/.test(t)) return false;
  if (BLOCKED_EN.test(t)) return false;
  if (t.split(/\s+/).length > 6) return false;
  return true;
}

/** 英文俗名：合法英文且不是拉丁学名 */
export function isValidImageSearchCommonName(
  value: string | null | undefined,
): value is string {
  if (!isValidImageSearchEn(value)) return false;
  if (isSuspiciousImageSearchTerm(value)) return false;
  return !isLikelyScientificName(value);
}

export function buildSpeciesImageSearchContext(opts: {
  userQuery: string;
  scientificName: string;
  searchQueryEn: string;
  taxon?: string | null;
}): SpeciesImageSearchContext {
  const ctx: SpeciesImageSearchContext = {
    nameZh: opts.userQuery.trim(),
    searchQueryEn: opts.searchQueryEn.trim(),
    scientificName: opts.scientificName.trim(),
  };
  const taxon = opts.taxon?.trim();
  if (taxon) ctx.taxon = taxon;
  if (process.env.UNSPLASH_DEBUG === "1") {
    console.warn("[species-image] search context", JSON.stringify(ctx));
  }
  return ctx;
}
