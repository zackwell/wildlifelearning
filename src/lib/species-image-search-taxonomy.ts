/** 搜图时按类群选择 Unsplash 后缀，避免一律加 wildlife animal 导致陆生图混入。 */

export type SpeciesImageTaxonGroup =
  | "bird"
  | "fish"
  | "marine_invertebrate"
  | "marine_mammal"
  | "reptile"
  | "amphibian"
  | "insect"
  | "mammal"
  | "other";

const GROUP_SUFFIX: Record<SpeciesImageTaxonGroup, string> = {
  bird: "bird",
  fish: "fish underwater",
  marine_invertebrate: "marine ocean",
  marine_mammal: "ocean marine",
  reptile: "reptile",
  amphibian: "amphibian",
  insect: "insect macro",
  mammal: "wildlife",
  other: "",
};

const TAXON_ZH: Array<{ group: SpeciesImageTaxonGroup; re: RegExp }> = [
  { group: "bird", re: /鸟纲|鸟类|鸟目|雀形|雁形|隼形|鸮形|鹤形|鹈形|鸻形|佛法僧|啄木|鹦鹉|猛禽|水禽/ },
  { group: "fish", re: /鱼纲|软骨鱼|硬骨鱼|辐鳍|板鳃|鲑形|鲈形|鲤形|鲀形|鳗形|鳕形|鲽形|鲨|翻车鲀|Molidae|月鱼目|Tetraodontiformes|Actinopterygii/ },
  { group: "marine_mammal", re: /鲸|海豚|鼠海豚|海牛|儒艮/ },
  { group: "marine_invertebrate", re: /刺胞|珊瑚|水母|钵水母|立方水母|僧帽|海葵|海蜇|头足|章鱼|乌贼|枪乌贼|腹足|双壳|贝类|甲壳|虾|蟹|龙虾|磷虾|海星|海参|海胆|腕足/ },
  { group: "reptile", re: /爬行纲|有鳞目|龟鳖|鳄形|蜥蜴|蛇亚|守宫/ },
  { group: "amphibian", re: /两栖纲|无尾目|有尾目|无肢目|蛙|蟾|蝾螈|鲵/ },
  { group: "insect", re: /昆虫纲|鞘翅|鳞翅|膜翅|双翅|直翅|半翅|蜻蜓|螳螂|金龟/ },
  { group: "mammal", re: /哺乳纲|兽纲|食肉目|偶蹄|奇蹄|灵长|啮齿|翼手|鲸目|鳍脚/ },
];

const NAME_ZH: Array<{ group: SpeciesImageTaxonGroup; re: RegExp }> = [
  { group: "reptile", re: /鳄|蛇|蜥|龟|鳖|守宫/ },
  { group: "amphibian", re: /蛙|蟾|蝾螈|鲵/ },
  { group: "marine_invertebrate", re: /水母|僧帽|海葵|珊瑚|章鱼|乌贼|鱿鱼|墨鱼|虾|蟹|龙虾|扇贝|牡蛎|蛤蜊|海参|海星|海胆|磷虾/ },
  { group: "marine_mammal", re: /鲸|豚|海牛|儒艮/ },
  { group: "fish", re: /翻车|翻车鲀|太阳鱼|月鱼|[鲨鲑鲈鲤鳕鳗鲷鲟鲢鲶鳟鲫鳊鲀魨]/ },
  { group: "bird", re: /[鸟鸡鸭鹅鸽鹤鹭鸥燕雀鹰隼鸮鹦鹉企鹅]/ },
  { group: "insect", re: /蝶|蛾|蜂|蚁|蝉|螳螂|蜻蜓|甲虫|蜘蛛|犀金龟|独角仙|兜虫|金龟子/ },
];

const EN_HINT: Array<{ group: SpeciesImageTaxonGroup; re: RegExp }> = [
  { group: "bird", re: /\b(bird|eagle|hawk|owl|parrot|penguin|crane|heron|duck|goose|swan|falcon|vulture|toucan|macaw|ostrich|cassowary|flamingo|pelican|kingfisher|hornbill)\b/i },
  { group: "fish", re: /\b(fish|salmon|trout|cod|tuna|bass|carp|eel|ray|skate|sardine|anchovy|grouper|snapper|marlin|swordfish|seahorse|clownfish|angelfish|sunfish|ocean sunfish|mola)\b/i },
  { group: "marine_mammal", re: /\b(whale|dolphin|porpoise|orca|manatee|dugong|narwhal)\b/i },
  { group: "marine_invertebrate", re: /\b(jellyfish|man-of-war|physalia|cnidari|coral|anemone|octopus|squid|cuttlefish|shrimp|prawn|crab|lobster|krill|starfish|sea star|urchin|nudibranch|hydra)\b/i },
  { group: "reptile", re: /\b(snake|lizard|gecko|iguana|chameleon|turtle|tortoise|crocodile|alligator|python|cobra|viper)\b/i },
  { group: "amphibian", re: /\b(frog|toad|salamander|newt|caecilian)\b/i },
  { group: "insect", re: /\b(insect|butterfly|moth|bee|wasp|ant|beetle|dragonfly|grasshopper|mantis|spider|rhinoceros beetle|stag beetle|scarab)\b/i },
  { group: "mammal", re: /\b(tiger|lion|bear|wolf|fox|elephant|panda|koala|kangaroo|wombat|deer|moose|zebra|giraffe|rhino|hippo|cheetah|leopard|monkey|ape|gorilla|bat|squirrel|rabbit|otter|seal|walrus|binturong|anteater|pangolin|armadillo)\b/i },
];

const SCI_FISH = /^(?:Cyprin|Salmo|Oncorhynch|Thunn|Scombr|Gadus|Carcharh|Sphyrn|Pterois|Amphiprion|Sebastes|Epinephelus|Anguilla|Clupea|Hippogloss|Mola|Ranzania)/i;
const SCI_MARINE_INV = /^(?:Physalia|Aurelia|Cassiopea|Chrysaora|Rhizostoma|Octopus|Sepia|Loligo|Homarus|Cancer|Penaeus|Litopenaeus|Strongylocentrotus|Asterias|Metridium|Acropora)/i;
const SCI_BIRD = /^(?:Struthio|Casuarius|Aquila|Falco|Bubo|Tyto|Anser|Cygnus|Phoenicopter|Sphenisc|Ara|Ramphastos|Buceros|Vulpes zerda)/i;
const SCI_MARINE_MAMMAL = /^(?:Balaen|Megaptera|Eubalaena|Tursiops|Delphinus|Orcinus|Physeter|Trichechus|Dugong)/i;
const SCI_INSECT = /^(?:Allomyrina|Trypoxylus|Dynastes|Megasoma|Lucanus|Cyclommatus)/i;

function matchGroupRules(
  text: string,
  rules: Array<{ group: SpeciesImageTaxonGroup; re: RegExp }>,
): SpeciesImageTaxonGroup | null {
  for (const { group, re } of rules) {
    if (re.test(text)) return group;
  }
  return null;
}

function inferFromScientificName(sci: string): SpeciesImageTaxonGroup | null {
  const t = sci.trim();
  if (!t) return null;
  const genus = t.split(/\s+/)[0] ?? "";
  if (SCI_MARINE_INV.test(genus) || SCI_MARINE_INV.test(t)) return "marine_invertebrate";
  if (SCI_MARINE_MAMMAL.test(genus) || SCI_MARINE_MAMMAL.test(t)) return "marine_mammal";
  if (SCI_INSECT.test(genus) || SCI_INSECT.test(t)) return "insect";
  if (SCI_FISH.test(genus) || SCI_FISH.test(t)) return "fish";
  if (SCI_BIRD.test(genus) || SCI_BIRD.test(t)) return "bird";
  if (/(idae|inae)$/i.test(t.split(/\s+/).pop() ?? "")) {
    const family = t.toLowerCase();
    if (/(?:idae|inae)$/.test(family) && /fish|shark|salmon|cod|cyprin|scombr|pleuronect|molid|tetraodont|balist/i.test(family)) {
      return "fish";
    }
  }
  return null;
}

/**
 * 根据中文名、taxon 文本、学名、英文俗名推断搜图类群。
 * 优先级：taxon 字段 > 学名 > 中文名 > 英文俗名。
 */
export function inferSpeciesImageTaxonGroup(opts: {
  nameZh?: string | null;
  taxon?: string | null;
  scientificName?: string | null;
  searchQueryEn?: string | null;
}): SpeciesImageTaxonGroup {
  const taxon = opts.taxon?.trim() ?? "";
  const sci = opts.scientificName?.trim() ?? "";
  const nameZh = opts.nameZh?.trim() ?? "";
  const en = opts.searchQueryEn?.trim() ?? "";

  const fromTaxon = taxon ? matchGroupRules(taxon, TAXON_ZH) : null;
  if (fromTaxon) return fromTaxon;

  const fromSci = inferFromScientificName(sci);
  if (fromSci) return fromSci;

  const fromZh = nameZh ? matchGroupRules(nameZh, NAME_ZH) : null;
  if (fromZh) return fromZh;

  const enBlob = `${en} ${sci}`.trim();
  const fromEn = enBlob ? matchGroupRules(enBlob, EN_HINT) : null;
  if (fromEn) return fromEn;

  return "other";
}

function suffixAlreadyInQuery(en: string, suffix: string): boolean {
  const lower = en.toLowerCase();
  return suffix.split(/\s+/).every((word) => lower.includes(word));
}

/** 按类群拼接 Unsplash 检索串（不再使用统一的 wildlife animal）。 */
export function buildUnsplashSearchQuery(
  searchQueryEn: string,
  group: SpeciesImageTaxonGroup,
): string {
  const en = searchQueryEn.trim();
  if (!en || /[\u4e00-\u9fff]/.test(en)) return "";

  const suffix = GROUP_SUFFIX[group];
  if (!suffix || suffixAlreadyInQuery(en, suffix)) {
    return en.slice(0, 120);
  }
  return `${en} ${suffix}`.slice(0, 120);
}

export function buildUnsplashSearchQueryFromContext(opts: {
  nameZh?: string | null;
  taxon?: string | null;
  scientificName?: string | null;
  searchQueryEn?: string | null;
}): { query: string; group: SpeciesImageTaxonGroup } {
  const searchQueryEn = opts.searchQueryEn?.trim() ?? "";
  const group = inferSpeciesImageTaxonGroup(opts);
  const query = buildUnsplashSearchQuery(searchQueryEn, group);
  return { query, group };
}
