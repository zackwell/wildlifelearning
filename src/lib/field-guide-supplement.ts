import type { ExploreSpeciesPayload } from "@/lib/explore-species";
import type { FieldGuideSavedEntry } from "@/lib/personal-field-guide";
import { loadFieldGuideEntries } from "@/lib/personal-field-guide";
import { normalizeModelMarkdown } from "@/lib/normalize-model-markdown";

export type FieldGuideMarkdownField =
  | "bodyStructureMarkdown"
  | "habitsMarkdown"
  | "funFactsMarkdown"
  | "bodyMarkdown"
  | "summary";

export type SupplementSection = {
  title: string;
  bodyMarkdown: string;
};

export type SupplementMergePlan = {
  targetField: FieldGuideMarkdownField | "newSection";
  /** 子分类标题（不含 #），用于并入已有 ## 小节或新建自定义分类 */
  subsectionTitle: string | null;
  /** 整理后的并入正文（Markdown，勿含物种名标题重复） */
  mergedContent: string;
  /** 展示用分类名，如「习性与行为」或自定义分类名 */
  categoryLabel: string;
};

export const FIELD_GUIDE_CATEGORY_META: {
  field: FieldGuideMarkdownField;
  label: string;
}[] = [
  { field: "bodyStructureMarkdown", label: "身体结构与器官" },
  { field: "habitsMarkdown", label: "习性与行为" },
  { field: "funFactsMarkdown", label: "趣闻与冷知识" },
  { field: "bodyMarkdown", label: "概览正文" },
  { field: "summary", label: "摘要" },
];

function slugifyKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractMarkdownH2Titles(md: string): string[] {
  const out: string[] = [];
  for (const line of md.split("\n")) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m?.[1]) out.push(m[1].trim());
  }
  return out;
}

export function buildFieldGuideCategoryIndex(species: ExploreSpeciesPayload): string {
  const lines: string[] = [];
  for (const { field, label } of FIELD_GUIDE_CATEGORY_META) {
    const md = species[field] ?? "";
    const subs = extractMarkdownH2Titles(md);
    lines.push(
      `- ${label}（field: ${field}）${subs.length ? `：子分类 ${subs.map((t) => `「${t}」`).join("、")}` : "：暂无 ## 子标题"}`,
    );
  }
  const custom = species.supplementSections ?? [];
  if (custom.length) {
    lines.push("- 已有自定义分类：");
    for (const s of custom) {
      lines.push(`  - 「${s.title}」`);
    }
  }
  return lines.join("\n");
}

/** 在「我的图鉴」中按 slug / 中文名 / 学名片段匹配 */
export async function findFieldGuideEntryForSpeciesKey(
  key: string,
): Promise<FieldGuideSavedEntry | null> {
  const raw = key.trim();
  if (!raw) return null;

  const slugKey = slugifyKey(raw);
  const lower = raw.toLowerCase();
  const entries = await loadFieldGuideEntries();

  for (const e of entries) {
    const s = e.species;
    if (slugKey && s.slug === slugKey) return e;
    if (slugKey && s.slug.replace(/-/g, "") === slugKey.replace(/-/g, "")) return e;
    if (s.name.trim() === raw) return e;
    if (s.name.includes(raw) || raw.includes(s.name.trim())) return e;
    if (s.scientificName.toLowerCase().includes(lower)) return e;
    if (lower.includes(s.scientificName.toLowerCase())) return e;
  }
  return null;
}

function normalizeTitle(title: string): string {
  return title.replace(/^#+\s*/, "").trim();
}

function appendBlock(base: string, heading: string, body: string): string {
  const b = base.trimEnd();
  const content = normalizeModelMarkdown(body).trim();
  if (!content) return b;
  const h = normalizeTitle(heading);
  const block = `## ${h}\n\n${content}`;
  return b.length ? `${b}\n\n${block}` : block;
}

function appendUnderExistingH2(md: string, h2Title: string, body: string): string {
  const title = normalizeTitle(h2Title);
  const content = normalizeModelMarkdown(body).trim();
  if (!content) return md;

  const lines = md.split("\n");
  const h2Line = `## ${title}`;
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.trim() === h2Line) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return appendBlock(md, title, content);

  let end = lines.length;
  for (let i = idx + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i] ?? "")) {
      end = i;
      break;
    }
  }
  const stamp = `_（智能助手补充 ${new Date().toLocaleDateString("zh-CN")}）_`;
  const insert = `\n\n${content}\n\n${stamp}\n`;
  const next = [...lines.slice(0, end), insert, ...lines.slice(end)];
  return next.join("\n").replace(/\n{4,}/g, "\n\n\n");
}

function appendToField(md: string, plan: SupplementMergePlan, question: string): string {
  const content =
    normalizeModelMarkdown(plan.mergedContent).trim() +
    `\n\n> 来源问题：${question.trim().slice(0, 200)}`;

  if (plan.subsectionTitle) {
    const existing = extractMarkdownH2Titles(md);
    const t = normalizeTitle(plan.subsectionTitle);
    if (existing.some((h) => h === t)) {
      return appendUnderExistingH2(md, t, content);
    }
    return appendBlock(md, t, content);
  }

  const stamp = `智能助手补充（${new Date().toLocaleDateString("zh-CN")}）`;
  return appendBlock(md, stamp, content);
}

export function applySupplementMergePlan(
  species: ExploreSpeciesPayload,
  plan: SupplementMergePlan,
  question: string,
): ExploreSpeciesPayload {
  if (plan.targetField === "newSection") {
    const title = normalizeTitle(plan.subsectionTitle ?? plan.categoryLabel) || "智能助手补充";
    const body =
      normalizeModelMarkdown(plan.mergedContent).trim() +
      `\n\n> 来源问题：${question.trim().slice(0, 200)}`;
    const prev = species.supplementSections ?? [];
    const i = prev.findIndex((s) => s.title === title);
    const next: SupplementSection[] = [...prev];
    if (i >= 0) {
      const merged = `${prev[i]!.bodyMarkdown.trim()}\n\n${body}`;
      next[i] = { title, bodyMarkdown: merged };
    } else {
      next.push({ title, bodyMarkdown: body });
    }
    return { ...species, supplementSections: next };
  }

  const field = plan.targetField;
  const current = species[field] ?? "";
  return {
    ...species,
    [field]: appendToField(current, plan, question),
  };
}

export function parseSupplementMergePlan(raw: unknown): SupplementMergePlan | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const target = o.targetField;
  const validTargets = [
    "bodyStructureMarkdown",
    "habitsMarkdown",
    "funFactsMarkdown",
    "bodyMarkdown",
    "summary",
    "newSection",
  ] as const;
  if (typeof target !== "string" || !validTargets.includes(target as (typeof validTargets)[number])) {
    return null;
  }
  if (typeof o.mergedContent !== "string" || o.mergedContent.trim().length < 8) return null;
  if (typeof o.categoryLabel !== "string" || o.categoryLabel.trim().length < 1) return null;

  let subsectionTitle: string | null = null;
  if (typeof o.subsectionTitle === "string" && o.subsectionTitle.trim()) {
    subsectionTitle = normalizeTitle(o.subsectionTitle);
  }

  return {
    targetField: target as SupplementMergePlan["targetField"],
    subsectionTitle,
    mergedContent: normalizeModelMarkdown(o.mergedContent).slice(0, 12000),
    categoryLabel: String(o.categoryLabel).trim().slice(0, 80),
  };
}
