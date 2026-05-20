import { resolveSpeciesNameAlias } from "@/lib/species-name-aliases";

export type SpeciesDisambiguationOption = {
  id: string;
  label: string;
  query: string;
  hint?: string;
};

export type SpeciesDisambiguation = {
  groupName: string;
  prompt: string;
  options: SpeciesDisambiguationOption[];
  allowGeneric: boolean;
  genericLabel: string;
};

type CuratedGroup = SpeciesDisambiguation;

function group(
  groupName: string,
  options: Array<{ id: string; label: string; query: string; hint?: string }>,
): CuratedGroup {
  return {
    groupName,
    prompt: `「${groupName}」包含多个常见物种，你想查询哪一种？`,
    options,
    allowGeneric: true,
    genericLabel: `继续查看笼统的「${groupName}」介绍`,
  };
}

/** 用数组 + keys 列表匹配，避免部分环境下对象中文键查找失效 */
const CURATED_ENTRIES: Array<{ keys: string[]; data: CuratedGroup }> = [
  {
    keys: ["大象", "象"],
    data: group("大象", [
    { id: "asian", label: "亚洲象", query: "亚洲象", hint: "Elephas maximus" },
    { id: "african", label: "非洲象", query: "非洲象", hint: "Loxodonta" },
    { id: "bush", label: "非洲草原象", query: "非洲草原象", hint: "Loxodonta africana" },
    { id: "forest", label: "非洲森林象", query: "非洲森林象", hint: "Loxodonta cyclotis" },
    ]),
  },
  {
    keys: ["虎", "老虎"],
    data: group("虎", [
    { id: "siberian", label: "东北虎", query: "东北虎", hint: "Panthera tigris altaica" },
    { id: "south-china", label: "华南虎", query: "华南虎" },
    { id: "bengal", label: "孟加拉虎", query: "孟加拉虎" },
    { id: "sumatran", label: "苏门答腊虎", query: "苏门答腊虎" },
    ]),
  },
  {
    keys: ["豹"],
    data: group("豹", [
    { id: "leopard", label: "豹（花豹）", query: "豹" },
    { id: "snow", label: "雪豹", query: "雪豹" },
    { id: "clouded", label: "云豹", query: "云豹" },
    ]),
  },
  {
    keys: ["熊"],
    data: group("熊", [
    { id: "panda", label: "大熊猫", query: "大熊猫" },
    { id: "brown", label: "棕熊", query: "棕熊" },
    { id: "black", label: "亚洲黑熊", query: "亚洲黑熊" },
    { id: "polar", label: "北极熊", query: "北极熊" },
    ]),
  },
  {
    keys: ["鹿"],
    data: group("鹿", [
    { id: "sika", label: "梅花鹿", query: "梅花鹿" },
    { id: "red", label: "马鹿", query: "马鹿" },
    { id: "musk", label: "麝", query: "麝" },
    { id: "roe", label: "狍", query: "狍" },
    ]),
  },
  {
    keys: ["鲸"],
    data: group("鲸", [
    { id: "blue", label: "蓝鲸", query: "蓝鲸" },
    { id: "humpback", label: "座头鲸", query: "座头鲸" },
    { id: "killer", label: "虎鲸", query: "虎鲸" },
    { id: "gray", label: "灰鲸", query: "灰鲸" },
    ]),
  },
  {
    keys: ["海豚"],
    data: group("海豚", [
    { id: "bottlenose", label: "宽吻海豚", query: "宽吻海豚" },
    { id: "common", label: "真海豚", query: "真海豚" },
    { id: "irrawaddy", label: "伊洛瓦底江豚", query: "伊洛瓦底江豚" },
    ]),
  },
  {
    keys: ["鹦鹉"],
    data: group("鹦鹉", [
    { id: "cockatoo", label: "葵花凤头鹦鹉", query: "葵花凤头鹦鹉" },
    { id: "macaw", label: "金刚鹦鹉", query: "金刚鹦鹉" },
    { id: "budgie", label: "虎皮鹦鹉", query: "虎皮鹦鹉" },
    ]),
  },
  {
    keys: ["鹰"],
    data: group("鹰", [
    { id: "golden", label: "金雕", query: "金雕" },
    { id: "steppe", label: "草原雕", query: "草原雕" },
    { id: "hawk-eagle", label: "鹰雕", query: "鹰雕" },
    ]),
  },
  {
    keys: ["雕"],
    data: group("雕", [
    { id: "golden", label: "金雕", query: "金雕" },
    { id: "steppe", label: "草原雕", query: "草原雕" },
    { id: "sea", label: "白尾海雕", query: "白尾海雕" },
    ]),
  },
  {
    keys: ["鳄鱼", "鳄"],
    data: group("鳄鱼", [
    { id: "siamese", label: "暹罗鳄", query: "暹罗鳄" },
    { id: "chinese", label: "扬子鳄", query: "扬子鳄" },
    { id: "saltwater", label: "湾鳄", query: "湾鳄" },
    ]),
  },
  {
    keys: ["猴", "猴子"],
    data: group("猴", [
    { id: "rhesus", label: "猕猴", query: "猕猴" },
    { id: "golden", label: "金丝猴", query: "金丝猴" },
    { id: "snub", label: "川金丝猴", query: "川金丝猴" },
    { id: "macaque", label: "藏酋猴", query: "藏酋猴" },
    ]),
  },
  {
    keys: ["羊", "绵羊"],
    data: group("羊", [
    { id: "sheep", label: "绵羊", query: "绵羊", hint: "Ovis aries" },
    { id: "goat", label: "山羊", query: "山羊", hint: "Capra" },
    { id: "argali", label: "盘羊", query: "盘羊" },
    { id: "bharal", label: "岩羊", query: "岩羊" },
    { id: "mouflon", label: "欧洲盘羊", query: "欧洲盘羊" },
    ]),
  },
  {
    keys: ["狐狸", "狐"],
    data: group("狐狸", [
    { id: "red", label: "赤狐", query: "赤狐" },
    { id: "arctic", label: "北极狐", query: "北极狐" },
    { id: "corsac", label: "沙狐", query: "沙狐" },
    ]),
  },
  {
    keys: ["狼"],
    data: group("狼", [
    { id: "gray", label: "灰狼", query: "灰狼" },
    { id: "tibetan", label: "藏狼", query: "藏狼" },
    ]),
  },
  {
    keys: ["蛇"],
    data: group("蛇", [
    { id: "king", label: "眼镜王蛇", query: "眼镜王蛇" },
    { id: "python", label: "蟒蛇", query: "蟒蛇" },
    { id: "cobra", label: "中华眼镜蛇", query: "中华眼镜蛇" },
    ]),
  },
  {
    keys: ["蛙"],
    data: group("蛙", [
    { id: "bullfrog", label: "牛蛙", query: "牛蛙" },
    { id: "tree", label: "树蛙", query: "树蛙" },
    { id: "giant", label: "巨蛙", query: "巨蛙" },
    ]),
  },
  {
    keys: ["企鹅"],
    data: group("企鹅", [
    { id: "emperor", label: "帝企鹅", query: "帝企鹅" },
    { id: "adelie", label: "阿德利企鹅", query: "阿德利企鹅" },
    { id: "gentoo", label: "巴布亚企鹅", query: "巴布亚企鹅" },
    ]),
  },
  {
    keys: ["鹤鸵", "食火鸡"],
    data: group("鹤鸵", [
      { id: "southern", label: "双垂鹤鸵", query: "双垂鹤鸵", hint: "Casuarius casuarius" },
      { id: "northern", label: "单垂鹤鸵", query: "单垂鹤鸵", hint: "Casuarius unappendiculatus" },
      { id: "dwarf", label: "侏鹤鸵", query: "侏鹤鸵", hint: "Casuarius bennetti" },
    ]),
  },
  {
    keys: ["鲨鱼", "鲨"],
    data: group("鲨鱼", [
    { id: "great-white", label: "大白鲨", query: "大白鲨" },
    { id: "whale", label: "鲸鲨", query: "鲸鲨" },
    { id: "hammerhead", label: "双髻鲨", query: "双髻鲨" },
    ]),
  },
];

function formatCuratedHit(hit: CuratedGroup): SpeciesDisambiguation {
  return {
    ...hit,
    groupName: hit.groupName,
    prompt: `「${hit.groupName}」包含多个常见物种，你想查询哪一种？`,
    genericLabel: `继续查看笼统的「${hit.groupName}」介绍`,
  };
}

export function isCuratedGroupQuery(query: string): boolean {
  const q = normalizeExploreSpeciesQuery(query);
  return CURATED_ENTRIES.some((entry) => entry.keys.includes(q));
}

export function normalizeExploreSpeciesQuery(query: string): string {
  return query.trim().normalize("NFKC");
}

export function isSpeciesDisambiguationPayload(value: unknown): value is SpeciesDisambiguation {
  if (!value || typeof value !== "object") return false;
  const d = value as SpeciesDisambiguation;
  return (
    typeof d.groupName === "string" &&
    Array.isArray(d.options) &&
    d.options.length > 0 &&
    d.options.every(
      (o) =>
        o &&
        typeof o === "object" &&
        typeof o.label === "string" &&
        typeof o.query === "string",
    )
  );
}

/** 2～3 字的常见具体种名（不含单独类群统称键） */
const KNOWN_SPECIFIC_SHORT = new Set([
  "鸵鸟",
  "袋鼠",
  "考拉",
  "海牛",
  "海狮",
  "海豹",
  "河马",
  "犀牛",
  "豺",
  "貘",
  "沙狐",
  "北极狐",
]);

/**
 * 「修饰语 + 动物类后缀」视为具体种，如阔耳狐、食火鸡、沙狐；
 * 单独的「狐」「虎」等仍走消歧表。
 */
const COMPOUND_SPECIES_SUFFIX =
  /(?:狐|虎|豹|熊|鹿|鲸|猴|蛇|蛙|企鹅|鲨|鹰|雕|鳄|龟|鸽|鸭|鹅|鸡|猫|狗|狼|象|鼠|兔|马|牛|羊|狮|海豚|河狸|海狸|獴|豺|貘|羚|驴|骡|猪|鼬|獾|獭|浣熊|熊猫|鲟|鲑|鳗|鲈|雀|燕|鹤|鹦鹉|犀|旱獭|水獭|鸵)$/;

export function resolveCuratedSpeciesDisambiguation(query: string): SpeciesDisambiguation | null {
  const q = normalizeExploreSpeciesQuery(query);
  if (!q) return null;

  for (const entry of CURATED_ENTRIES) {
    if (entry.keys.includes(q)) {
      return formatCuratedHit(entry.data);
    }
  }
  return null;
}

/** 已是具体种名时不再走 LLM 歧义推断 */
export function looksSpecificSpeciesName(query: string): boolean {
  const q = normalizeExploreSpeciesQuery(query);
  if (!q) return false;
  if (isCuratedGroupQuery(q)) return false;
  if (resolveSpeciesNameAlias(q)) return true;
  if (KNOWN_SPECIFIC_SHORT.has(q)) return true;
  if (q.length >= 2 && COMPOUND_SPECIES_SUFFIX.test(q)) return true;
  if (q.length >= 5) return true;
  const specificMarkers =
    /(东北|华南|亚洲|非洲|草原|森林|孟加拉|苏门答腊|赤|金丝|川|白尾|座头|宽吻|伊洛瓦底|扬子|湾|暹罗|眼镜王|中华|巴布亚|阿德利|帝|双髻|大白|鲸鲨|花豹|雪豹|云豹|金钱豹|猎豹|阔耳|耳廓|双垂|单垂|侏鹤)/;
  if (specificMarkers.test(q)) return true;
  if (/[a-zA-Z]/.test(q)) return true;
  return false;
}
