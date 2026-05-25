/**
 * 生僻字、台湾用字、古籍异名 → 现代常用中文名 / 维基条目标题。
 * 图鉴展示名优先用 canonicalZh（规范种名）；用户输入为别称时在 summary 说明。
 */
export type SpeciesNameAlias = {
  modernZh: string;
  /** 图鉴展示用规范中文种名（与用户输入为别称时不同） */
  canonicalZh?: string;
  wikiTitles: string[];
  note: string;
  scientificNameHint?: string;
};

/** 键为用户可能输入的字符串（trim 后精确匹配） */
const ALIASES: Record<string, SpeciesNameAlias> = {
  阔耳狐: {
    modernZh: "阔耳狐",
    canonicalZh: "耳廓狐",
    wikiTitles: ["耳廓狐", "阔耳狐"],
    note:
      "「阔耳狐」即耳廓狐（Fennec fox，Vulpes zerda），撒哈拉沙漠特有的小型狐。图鉴 name 用规范名「耳廓狐」；summary 首句说明「阔耳狐」为别称。",
    scientificNameHint: "Vulpes zerda",
  },
  耳廓狐: {
    modernZh: "阔耳狐",
    canonicalZh: "耳廓狐",
    wikiTitles: ["耳廓狐", "阔耳狐"],
    note:
      "「耳廓狐」与「阔耳狐」为同一物种（Fennec fox，Vulpes zerda）。图鉴 name 用「耳廓狐」。",
    scientificNameHint: "Vulpes zerda",
  },
  单垂鹤鸵: {
    modernZh: "单垂鹤鸵",
    wikiTitles: ["单垂鹤鸵", "Northern cassowary"],
    note:
      "「单垂鹤鸵」即 Casuarius unappendiculatus，分布于新几内亚北部。应撰写完整科普；JSON 的 name 仍填「单垂鹤鸵」，禁止写成双垂鹤鸵、鸵鸟或笼统「记载较少」。",
    scientificNameHint: "Casuarius unappendiculatus",
  },
  侏鹤鸵: {
    modernZh: "侏鹤鸵",
    wikiTitles: ["侏鹤鸵", "Dwarf cassowary"],
    note:
      "「侏鹤鸵」即 Casuarius bennetti，体型最小的鹤鸵。应撰写完整科普；JSON 的 name 仍填「侏鹤鸵」，禁止写成双垂鹤鸵、鸵鸟或笼统「记载较少」。",
    scientificNameHint: "Casuarius bennetti",
  },
  朱鹤鸵: {
    modernZh: "侏鹤鸵",
    canonicalZh: "侏鹤鸵",
    wikiTitles: ["侏鹤鸵", "Dwarf cassowary"],
    note:
      "用户输入「朱鹤鸵」通常指「侏鹤鸵」（Casuarius bennetti，「朱」为「侏」之常见误写）。应撰写侏鹤鸵完整科普；图鉴 name 用「侏鹤鸵」；summary 首句说明「朱鹤鸵」为别称/误写。",
    scientificNameHint: "Casuarius bennetti",
  },
  双垂鹤鸵: {
    modernZh: "双垂鹤鸵",
    wikiTitles: ["双垂鹤鸵", "Southern cassowary"],
    note:
      "「双垂鹤鸵」即 Casuarius casuarius，分布于澳大利亚与新几内亚南部。应撰写完整科普；name 仍填「双垂鹤鸵」。",
    scientificNameHint: "Casuarius casuarius",
  },
  鵎鵼: {
    modernZh: "巨嘴鸟",
    canonicalZh: "巨嘴鸟",
    wikiTitles: ["巨嘴鸟", "鵎鵼属", "巨嘴鸟科"],
    note:
      "「鵎鵼」为台湾及文献用字，所指即巨嘴鸟（鵎鵼科 Ramphastidae，含鵎鵼属 Ramphastos）。应撰写巨嘴鸟的完整科普；图鉴 name 用「巨嘴鸟」；summary 首句说明「鵎鵼」为别称。禁止写成䴙䴘等其他鸟类，禁止写「记载较少」。",
    scientificNameHint: "Ramphastos",
  },
  羚牛: {
    modernZh: "羚牛",
    canonicalZh: "扭角羚",
    wikiTitles: ["羚牛", "扭角羚"],
    note:
      "「羚牛」即扭角羚（Budorcas taxicolor），中国西部高山有分布。应撰写扭角羚完整科普；图鉴 name 用「扭角羚」；summary 说明「羚牛」为别称。禁止写成欧洲野牛、角马或其他牛科动物。",
    scientificNameHint: "Budorcas taxicolor",
  },
  独角仙: {
    modernZh: "独角仙",
    canonicalZh: "双叉犀金龟",
    wikiTitles: ["双叉犀金龟", "独角仙"],
    note:
      "「独角仙」是双叉犀金龟（Allomyrina dichotoma，金龟子科）的常用俗名，「兜虫」亦同。图鉴 name 用规范名「双叉犀金龟」；summary 首句说明「独角仙」为别称。禁止写虚构生物。",
    scientificNameHint: "Allomyrina dichotoma",
  },
  兜虫: {
    modernZh: "独角仙",
    canonicalZh: "双叉犀金龟",
    wikiTitles: ["双叉犀金龟", "独角仙"],
    note:
      "「兜虫」通常指双叉犀金龟（Allomyrina dichotoma）。图鉴 name 用「双叉犀金龟」；summary 说明「兜虫」为别称。",
    scientificNameHint: "Allomyrina dichotoma",
  },
  卡皮巴拉: {
    modernZh: "水豚",
    canonicalZh: "水豚",
    wikiTitles: ["水豚", "Capybara"],
    note:
      "「卡皮巴拉」是网络对水豚（Hydrochoerus hydrochaeris）的戏称/别称。图鉴 name 用「水豚」；summary 首句说明别称关系。",
    scientificNameHint: "Hydrochoerus hydrochaeris",
  },
  水豚: {
    modernZh: "水豚",
    canonicalZh: "水豚",
    wikiTitles: ["水豚", "Capybara"],
    note: "「水豚」即 Hydrochoerus hydrochaeris，世界上最大的啮齿动物。",
    scientificNameHint: "Hydrochoerus hydrochaeris",
  },
  Capybara: {
    modernZh: "水豚",
    canonicalZh: "水豚",
    wikiTitles: ["水豚", "Capybara"],
    note:
      "「Capybara」是水豚（Hydrochoerus hydrochaeris）的英文俗名。图鉴 name 用「水豚」；summary 首句说明英文俗名关系。",
    scientificNameHint: "Hydrochoerus hydrochaeris",
  },
  capybara: {
    modernZh: "水豚",
    canonicalZh: "水豚",
    wikiTitles: ["水豚", "Capybara"],
    note:
      "「capybara」是水豚（Hydrochoerus hydrochaeris）的英文俗名。图鉴 name 用「水豚」；summary 首句说明英文俗名关系。",
    scientificNameHint: "Hydrochoerus hydrochaeris",
  },
  珍珠鸡: {
    modernZh: "珍珠鸡",
    canonicalZh: "珍珠鸡",
    wikiTitles: ["珍珠鸡", "普通珠鸡", "Helmeted guineafowl"],
    note:
      "「珍珠鸡」通常指盔珠鸡/普通珠鸡（Numida meleagris，Helmeted Guineafowl），又称珠鸡、几内亚鸟。百度百科「珍珠鸡」为多义词，常见义项为珠鸡科养殖种；图鉴 name 用「珍珠鸡」。",
    scientificNameHint: "Numida meleagris",
  },
};

export function resolveSpeciesNameAlias(query: string): SpeciesNameAlias | null {
  const q = query.trim();
  if (!q) return null;
  if (ALIASES[q]) return ALIASES[q];
  const lower = q.toLowerCase();
  for (const [key, value] of Object.entries(ALIASES)) {
    if (/^[A-Za-z]/.test(key) && key.toLowerCase() === lower) return value;
  }
  return null;
}

/** 配图、检索用的中文名：有别名用现代名，否则用用户输入 */
export function speciesDisplaySearchNameZh(
  userQuery: string,
  alias: SpeciesNameAlias | null,
): string {
  return alias?.modernZh ?? userQuery.trim();
}
