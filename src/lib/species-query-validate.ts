import { resolveSpeciesNameAlias } from "@/lib/species-name-aliases";
import type { SpeciesWikiAnchor } from "@/lib/species-wiki-anchor";

export const SPECIES_QUERY_INVALID_MESSAGE = "请输入存在的物种";

/** 整句/整词命中则视为明显非物种名 */
const EXACT_BLOCKED = new Set(
  [
    "测试", "test", "null", "undefined", "asdf", "qwerty", "abc", "xxx",
    "汽车", "轿车", "卡车", "摩托", "自行车", "飞机", "高铁", "地铁", "轮船",
    "手机", "电脑", "笔记本", "平板", "电视", "冰箱", "空调", "洗衣机",
    "股票", "基金", "期货", "比特币", "区块链", "人民币", "美元",
    "足球", "篮球", "排球", "乒乓球", "羽毛球",
    "人工智能", "机器学习", "深度学习", "ChatGPT", "GPT",
    "软件", "程序", "代码", "算法", "数据库", "网站", "APP", "应用",
    "公司", "企业", "银行", "政府", "学校", "大学", "中学", "小学",
    "北京", "上海", "广州", "深圳", "中国", "美国", "日本",
    "桌子", "椅子", "沙发", "床", "窗户", "门", "房子", "建筑", "大楼",
    "米饭", "面条", "火锅", "咖啡", "奶茶",
    "音乐", "电影", "游戏", "小说", "新闻", "天气", "时间", "爱情",
    "男人", "女人", "老师", "学生", "医生", "警察",
    "太阳", "月亮", "地球", "星星", "云", "雨", "雪", "风",
    "红色", "蓝色", "绿色", "黑色", "白色",
    "动物", "植物", "生物", "物种", "哺乳动物", "鸟类",
  ].map((s) => s.toLowerCase()),
);

/** 子串出现即视为明显非物种（慎用，仅放不易误伤动物名的词） */
const SUBSTRING_BLOCKED = [
  "手机",
  "电脑",
  "汽车",
  "轿车",
  "有限公司",
  "股份",
  "集团",
  "科技",
  "网络",
  "证券",
  "期货",
  "比特币",
  "区块链",
  "人工智能",
  "机器学习",
  "ChatGPT",
  "操作系统",
  "数据库",
  "服务器",
  "浏览器",
  "微信",
  "支付宝",
  "淘宝",
  "京东",
  "是什么",
  "为什么",
  "怎么样",
  "怎么办",
  "如何",
  "请问",
  "帮我",
  "写一段",
  "写一篇",
  "介绍一",
  "http://",
  "https://",
  "www.",
  ".com",
  ".cn",
  "@",
];

const BINOMIAL_RE = /^[A-Z][a-z]+(?:\s+[a-z]+){1,2}$/;

function normalizeForMatch(q: string): string {
  return q.trim().toLowerCase();
}

function hasLetterOrHan(q: string): boolean {
  return /[\p{L}\p{Script=Han}]/u.test(q);
}

function looksLikeSentence(q: string): boolean {
  if (/[？?]/.test(q)) return true;
  if (q.length > 14 && /[，,。.!！；;：:]/.test(q)) return true;
  if (q.length > 24) return true;
  return false;
}

function matchesBlocked(q: string): boolean {
  const n = normalizeForMatch(q);
  if (EXACT_BLOCKED.has(n)) return true;

  const compact = n.replace(/\s+/g, "");
  if (EXACT_BLOCKED.has(compact)) return true;

  for (const frag of SUBSTRING_BLOCKED) {
    if (q.includes(frag) || n.includes(frag.toLowerCase())) return true;
  }

  if (/^\d+$/.test(q)) return true;
  if (/^[\d\s\p{P}\p{S}]+$/u.test(q)) return true;
  if (/^https?:\/\//i.test(q) || /^www\./i.test(q)) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q)) return true;

  return false;
}

export type SpeciesQueryValidation =
  | { ok: true }
  | { ok: false; error: string };

/**
 * 探索物种前的输入校验：明显非生物/非物种名时直接拒绝，避免浪费模型调用。
 * 已知异名表或维基锚定命中时放宽（仍排除 URL、问句等硬规则）。
 */
export function validateExploreSpeciesQuery(
  query: string,
  opts?: {
    alias?: ReturnType<typeof resolveSpeciesNameAlias>;
    wikiAnchor?: SpeciesWikiAnchor | null;
  },
): SpeciesQueryValidation {
  const q = query.trim();
  if (!q) {
    return { ok: false, error: SPECIES_QUERY_INVALID_MESSAGE };
  }

  if (!hasLetterOrHan(q)) {
    return { ok: false, error: SPECIES_QUERY_INVALID_MESSAGE };
  }

  if (looksLikeSentence(q)) {
    return { ok: false, error: SPECIES_QUERY_INVALID_MESSAGE };
  }

  if (BINOMIAL_RE.test(q.trim())) {
    return { ok: true };
  }

  const hasKnownSpecies =
    Boolean(opts?.alias) ||
    Boolean(opts?.wikiAnchor?.zhTitle && opts.wikiAnchor.matchQuality !== "none");

  if (!hasKnownSpecies && matchesBlocked(q)) {
    return { ok: false, error: SPECIES_QUERY_INVALID_MESSAGE };
  }

  if (!hasKnownSpecies && q.length === 1) {
    const generic = new Set(["兽", "鸟", "鱼", "虫", "草", "树", "花"]);
    if (generic.has(q)) {
      return { ok: false, error: SPECIES_QUERY_INVALID_MESSAGE };
    }
  }

  return { ok: true };
}
