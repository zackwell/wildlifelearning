/** Unsplash / 维基配图：粗筛「像动物图」的文本信号 */

const NON_ANIMAL_RE =
  /\b(portrait|headshot|selfie|wedding|bride|groom|business(?:man|woman|person)?|model|fashion|makeup|cosmetic|office|skyline|downtown|architecture|building|interior design|restaurant|food|dish|cuisine|coffee|beer|wine|cocktail|recipe|kitchen|car|automobile|vehicle|truck|motorcycle|airplane cabin|airport|train station|logo|icon|vector|illustration|cartoon|anime|manga|infographic|diagram|chart|map\b|stadium|football|soccer|basketball|concert|festival crowd|protest|soldier|police|doctor|hospital|laptop|computer|phone|smartphone|workspace|meeting|handshake|couple|family|children|kids|baby|toddler|woman|man|people|person|human|girl|boy|teen|modeling|runway|jewelry|ring\b|necklace|flower bouquet|still life|product shot|ecommerce|shopping|store|mall|street fashion)\b/i;

const ANIMAL_RE =
  /\b(animal|wildlife|mammal|bird|avian|fish|shark|whale|dolphin|reptile|snake|lizard|turtle|tortoise|amphibian|frog|salamander|insect|butterfly|moth|beetle|spider|crustacean|zoo|safari|habitat|predator|prey|herbivore|carnivore|species|fauna|nest\b|den\b|paw|claw|beak|feather|fur|scales|antler|horn\b|trunk\b|tusk|fin\b|wing\b|flock|herd|pack\b|pride\b|marsupial|rodent|primate|ungulate|canid|felid|ursid|elephant|tiger|lion|bear|wolf|fox|deer|moose|eagle|hawk|owl|penguin|parrot|macaw|toucan|panda|koala|giraffe|zebra|rhino|hippo|cheetah|leopard|jaguar|panther|crocodile|alligator|otter|seal\b|walrus|monkey|ape\b|gorilla|orangutan|macaque|squirrel|rabbit|hare|bat\b|hedgehog|porcupine|kangaroo|platypus)\b/i;

const NON_ANIMAL_ZH =
  /(人像|肖像|自拍|婚礼|新娘|新郎|时装|化妆|城市|建筑|大楼|美食|餐饮|菜肴|咖啡|汽车|飞机|机场|火车|地铁|办公室|会议|电脑|手机|购物|商场|街道|人群|游客照|合影|家庭|儿童|婴儿|女人|男人|人物|模特|首饰|珠宝|鲜花|静物|产品|广告|插画|卡通|动漫|图标|地图|球场|足球|篮球|演唱会|节日|士兵|警察|医院|医生|护士|工作)/;

const ANIMAL_ZH =
  /(动物|野生动物|哺乳|鸟类|鸟纲|鱼纲|爬行|两栖|昆虫|动物园|栖息地|物种|兽|鸟|鱼|虫|象|虎|豹|熊|狼|狐|鹿|鲸|豚|鳄|龟|蛙|蝶|蜂|蚁|熊猫|袋鼠|考拉|长颈鹿|斑马|犀牛|河马|猎豹|狮子|老鹰|猫头鹰|企鹅|鹦鹉|巨嘴|灵长|猴|松鼠|兔|蝙蝠|刺猬|海狮|海豹)/;

function normalizeText(parts: Array<string | null | undefined>): string {
  return parts
    .filter((p): p is string => typeof p === "string" && p.length > 0)
    .join(" ")
    .toLowerCase();
}

export function isLikelyNonAnimalImageText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (NON_ANIMAL_RE.test(t) || NON_ANIMAL_ZH.test(t)) return true;
  return false;
}

export function isLikelyAnimalImageText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (ANIMAL_RE.test(t) || ANIMAL_ZH.test(t)) return true;
  return false;
}

/**
 * 对单张 Unsplash 结果打分。分数越高越像目标物种动物图。
 * queryTokens: 来自 slug / 学名 / 英文短语的小写词元
 */
export function scoreSpeciesImageCandidate(
  meta: {
    description?: string | null;
    alt_description?: string | null;
    tags?: Array<{ title?: string } | string>;
  },
  queryTokens: string[],
): number {
  const tagTitles =
    meta.tags?.map((t) => (typeof t === "string" ? t : t.title)) ?? [];
  const blob = normalizeText([meta.description, meta.alt_description, ...tagTitles]);

  if (!blob) return 0;

  if (isLikelyNonAnimalImageText(blob)) return -100;

  let score = 0;
  if (isLikelyAnimalImageText(blob)) score += 6;

  for (const token of queryTokens) {
    if (token.length < 3) continue;
    if (blob.includes(token)) score += 2;
  }

  if (/\b(nature|natural|outdoor|forest|jungle|savanna|grassland|wetland|ocean|marine|reef|mountain|river|lake)\b/i.test(blob)) {
    score += 1;
  }

  return score;
}

export function collectQueryTokens(
  nameZh: string,
  scientificName: string,
  slug: string,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (s: string) => {
    const t = s.trim().toLowerCase();
    if (t.length < 2) return;
    if (seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  slug
    .replace(/-/g, " ")
    .split(/\s+/)
    .forEach(push);
  scientificName
    .trim()
    .split(/\s+/)
    .forEach(push);

  const enName = nameZh.replace(/\*+/g, "").trim();
  if (enName && !/[\u4e00-\u9fff]/.test(enName)) {
    enName.split(/\s+/).forEach(push);
  }

  return out;
}

export function speciesImageStrictAnimalFilter(): boolean {
  const v = process.env.SPECIES_IMAGE_STRICT_ANIMAL?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return true;
}
