/**
 * 生僻字、台湾用字、古籍异名 → 现代常用中文名 / 维基条目标题。
 * 探索时仍保留用户输入作图鉴 name，但正文与维基锚定按现代名解析。
 */
export type SpeciesNameAlias = {
  modernZh: string;
  wikiTitles: string[];
  note: string;
  scientificNameHint?: string;
};

/** 键为用户可能输入的字符串（trim 后精确匹配） */
const ALIASES: Record<string, SpeciesNameAlias> = {
  阔耳狐: {
    modernZh: "阔耳狐",
    wikiTitles: ["耳廓狐", "阔耳狐"],
    note:
      "「阔耳狐」即耳廓狐（Fennec fox，Vulpes zerda），撒哈拉沙漠特有的小型狐。应撰写耳廓狐完整科普；JSON 的 name 仍填「阔耳狐」，禁止写成赤狐或其他狐类。",
    scientificNameHint: "Vulpes zerda",
  },
  耳廓狐: {
    modernZh: "阔耳狐",
    wikiTitles: ["耳廓狐", "阔耳狐"],
    note:
      "「耳廓狐」与「阔耳狐」为同一物种（Fennec fox，Vulpes zerda）。应撰写详实正文；JSON 的 name 仍填用户输入字形。",
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
    wikiTitles: ["侏鹤鸵", "Dwarf cassowary"],
    note:
      "用户输入「朱鹤鸵」通常指「侏鹤鸵」（Casuarius bennetti，「朱」为「侏」之常见误写）。应撰写侏鹤鸵完整科普；JSON 的 name 仍填用户输入「朱鹤鸵」。",
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
    wikiTitles: ["巨嘴鸟", "鵎鵼属", "巨嘴鸟科"],
    note:
      "「鵎鵼」为台湾及文献用字，所指即巨嘴鸟（鵎鵼科 Ramphastidae，含鵎鵼属 Ramphastos）。应撰写巨嘴鸟的完整科普；JSON 的 name 仍填用户输入「鵎鵼」，summary 可一句说明即今称巨嘴鸟。禁止写成䴙䴘等其他鸟类，禁止写「记载较少」。",
    scientificNameHint: "Ramphastos",
  },
  羚牛: {
    modernZh: "羚牛",
    wikiTitles: ["羚牛", "扭角羚"],
    note:
      "「羚牛」即扭角羚（Budorcas taxicolor），中国西部高山有分布。应撰写羚牛完整科普；JSON 的 name 仍填用户输入。禁止写成欧洲野牛、角马或其他牛科动物。",
    scientificNameHint: "Budorcas taxicolor",
  },
};

export function resolveSpeciesNameAlias(query: string): SpeciesNameAlias | null {
  const q = query.trim();
  if (!q) return null;
  return ALIASES[q] ?? null;
}

/** 配图、检索用的中文名：有别名用现代名，否则用用户输入 */
export function speciesDisplaySearchNameZh(
  userQuery: string,
  alias: SpeciesNameAlias | null,
): string {
  return alias?.modernZh ?? userQuery.trim();
}
