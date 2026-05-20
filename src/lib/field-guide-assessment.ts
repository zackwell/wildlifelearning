import { extractJsonObject } from "@/lib/explore-species";
import { normalizeModelMarkdown } from "@/lib/normalize-model-markdown";
import type { ExploreSpeciesPayload } from "@/lib/explore-species";

export type AssessmentQuestionType = "choice" | "true_false" | "multi_select";

export type AssessmentQuestion = {
  id: string;
  type: AssessmentQuestionType;
  question: string;
  points: number;
  explanation: string;
  options?: [string, string, string, string];
  correctIndex?: 0 | 1 | 2 | 3;
  correctTrueFalse?: boolean;
  /** 思维发散：不定项多选，5-6 个选项 */
  multiOptions?: string[];
  correctIndices?: number[];
};

export type GradingTier = {
  label: string;
  minPercent: number;
  description: string;
};

export type AssessmentPaper = {
  title: string;
  speciesName: string;
  questions: AssessmentQuestion[];
  gradingStandard: {
    summary: string;
    tiers: GradingTier[];
  };
};

export type UserAnswers = Record<string, number | boolean | number[] | null>;

export type QuestionGrade = {
  id: string;
  earned: number;
  max: number;
  isCorrect: boolean | null;
  feedback: string;
};

export type AssessmentResult = {
  earned: number;
  max: number;
  percent: number;
  tier: GradingTier;
  grades: QuestionGrade[];
};

const DEFAULT_TIERS: GradingTier[] = [
  { label: "优秀", minPercent: 90, description: "掌握扎实，能准确运用图鉴知识。" },
  { label: "良好", minPercent: 75, description: "基本掌握，个别细节可再巩固。" },
  { label: "及格", minPercent: 60, description: "达到入门要求，建议重读薄弱部分。" },
  { label: "待加强", minPercent: 0, description: "建议系统复习图鉴正文后再次检测。" },
];

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function parseQuestion(raw: unknown, index: number): AssessmentQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const type = o.type;
  const normalizedType =
    type === "open" || type === "insight" || type === "multi"
      ? "multi_select"
      : type;
  if (normalizedType !== "choice" && normalizedType !== "true_false" && normalizedType !== "multi_select") {
    return null;
  }

  const question = normalizeModelMarkdown(String(o.question ?? "")).trim();
  const explanation = normalizeModelMarkdown(String(o.explanation ?? "")).trim();
  if (question.length < 4 || explanation.length < 8) return null;

  const pointsRaw = Number(o.points);
  const points = Number.isFinite(pointsRaw) && pointsRaw > 0 ? Math.min(20, Math.round(pointsRaw)) : 5;

  const id =
    typeof o.id === "string" && o.id.trim()
      ? o.id.trim().slice(0, 40)
      : `q-${index + 1}`;

  if (normalizedType === "choice") {
    const opts = o.options;
    if (!Array.isArray(opts) || opts.length !== 4) return null;
    const options = opts.map((x) => normalizeModelMarkdown(String(x)).trim()) as [
      string,
      string,
      string,
      string,
    ];
    if (options.some((s) => s.length === 0)) return null;
    const ci = Number(o.correctIndex);
    if (!Number.isInteger(ci) || ci < 0 || ci > 3) return null;
    return {
      id,
      type: normalizedType,
      question,
      points,
      explanation,
      options,
      correctIndex: ci as 0 | 1 | 2 | 3,
    };
  }

  if (normalizedType === "true_false") {
    if (typeof o.correctTrueFalse !== "boolean") return null;
    return {
      id,
      type: normalizedType,
      question,
      points,
      explanation,
      correctTrueFalse: o.correctTrueFalse,
    };
  }

  const rawOpts = o.multiOptions ?? o.options;
  if (!Array.isArray(rawOpts) || rawOpts.length < 5 || rawOpts.length > 7) return null;
  const multiOptions = rawOpts.map((x) => normalizeModelMarkdown(String(x)).trim());
  if (multiOptions.some((s) => s.length === 0)) return null;

  const rawCorrect = o.correctIndices ?? o.correctIndex;
  let correctIndices: number[] = [];
  if (Array.isArray(rawCorrect)) {
    correctIndices = rawCorrect
      .map((x) => Number(x))
      .filter((n) => Number.isInteger(n) && n >= 0 && n < multiOptions.length);
  } else if (Number.isInteger(Number(rawCorrect))) {
    correctIndices = [Number(rawCorrect)];
  }
  correctIndices = [...new Set(correctIndices)].sort((a, b) => a - b);
  if (correctIndices.length < 2 || correctIndices.length > 4) return null;

  return {
    id,
    type: "multi_select",
    question,
    points,
    explanation,
    multiOptions,
    correctIndices,
  };
}

function parseTiers(raw: unknown): GradingTier[] {
  if (!Array.isArray(raw)) return DEFAULT_TIERS;
  const tiers: GradingTier[] = [];
  for (const el of raw.slice(0, 6)) {
    if (!el || typeof el !== "object") continue;
    const o = el as Record<string, unknown>;
    const label = String(o.label ?? "").trim();
    const minPercent = Number(o.minPercent);
    const description = String(o.description ?? "").trim();
    if (!label || !Number.isFinite(minPercent) || description.length < 4) continue;
    tiers.push({
      label,
      minPercent: Math.max(0, Math.min(100, Math.round(minPercent))),
      description,
    });
  }
  tiers.sort((a, b) => b.minPercent - a.minPercent);
  return tiers.length >= 2 ? tiers : DEFAULT_TIERS;
}

export function parseAssessmentPaper(raw: unknown): AssessmentPaper | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const speciesName = String(o.speciesName ?? o.title ?? "").trim();
  const title = String(o.title ?? `学习检测 · ${speciesName}`).trim();
  if (!speciesName || !title) return null;

  if (!Array.isArray(o.questions) || o.questions.length < 4) return null;

  const questions: AssessmentQuestion[] = [];
  for (let i = 0; i < o.questions.length; i++) {
    const q = parseQuestion(o.questions[i], i);
    if (q) questions.push(q);
  }
  if (questions.length < 4) return null;

  const hasChoice = questions.some((q) => q.type === "choice");
  const hasTf = questions.some((q) => q.type === "true_false");
  const hasMulti = questions.some((q) => q.type === "multi_select");
  if (!hasChoice || !hasTf || !hasMulti) return null;

  const gs = o.gradingStandard;
  let summary = "按得分率划分等级；选择题、判断题、思维多选题均为自动计分。";
  let tiers = DEFAULT_TIERS;
  if (gs && typeof gs === "object") {
    const g = gs as Record<string, unknown>;
    if (isNonEmptyString(g.summary)) summary = g.summary.trim();
    tiers = parseTiers(g.tiers);
  }

  return {
    title,
    speciesName,
    questions,
    gradingStandard: { summary, tiers },
  };
}

export function parseAssessmentFromLlmText(text: string): AssessmentPaper | null {
  return parseAssessmentPaper(extractJsonObject(text));
}

export function resolveTier(percent: number, tiers: GradingTier[]): GradingTier {
  const sorted = [...tiers].sort((a, b) => b.minPercent - a.minPercent);
  for (const t of sorted) {
    if (percent >= t.minPercent) return t;
  }
  return sorted[sorted.length - 1] ?? DEFAULT_TIERS[DEFAULT_TIERS.length - 1]!;
}

export function gradeMultiSelect(
  q: AssessmentQuestion,
  picked: number[] | null | undefined,
): QuestionGrade {
  const correct = new Set(q.correctIndices ?? []);
  const selected = new Set(
    (picked ?? []).filter((n) => Number.isInteger(n) && n >= 0),
  );
  let hits = 0;
  let falsePicks = 0;
  for (const i of selected) {
    if (correct.has(i)) hits++;
    else falsePicks++;
  }
  const totalCorrect = correct.size;
  let ratio = 0;
  if (falsePicks === 0 && hits === totalCorrect) {
    ratio = 1;
  } else if (falsePicks === 0) {
    ratio = hits / totalCorrect;
  } else {
    ratio = Math.max(0, (hits - falsePicks) / totalCorrect);
  }
  const earned = Math.round(q.points * ratio);
  const ok = earned >= q.points * 0.85;
  const partial = earned > 0 && !ok;
  return {
    id: q.id,
    earned,
    max: q.points,
    isCorrect: ok ? true : partial ? null : false,
    feedback: ok
      ? "全部选对。"
      : partial
        ? `命中 ${hits}/${totalCorrect} 个要点${falsePicks > 0 ? `，误选 ${falsePicks} 项` : ""}。`
        : "要点匹配不足，请查看解析。",
  };
}

export function gradeObjectiveQuestions(
  paper: AssessmentPaper,
  answers: UserAnswers,
): QuestionGrade[] {
  const grades: QuestionGrade[] = [];
  for (const q of paper.questions) {
    const ans = answers[q.id];
    if (q.type === "choice") {
      const picked = typeof ans === "number" ? ans : null;
      const ok = picked === q.correctIndex;
      grades.push({
        id: q.id,
        earned: ok ? q.points : 0,
        max: q.points,
        isCorrect: ok,
        feedback: ok ? "回答正确。" : "回答错误，请查看解析。",
      });
    } else if (q.type === "true_false") {
      const picked = typeof ans === "boolean" ? ans : null;
      const ok = picked === q.correctTrueFalse;
      grades.push({
        id: q.id,
        earned: ok ? q.points : 0,
        max: q.points,
        isCorrect: ok,
        feedback: ok ? "判断正确。" : "判断错误，请查看解析。",
      });
    } else if (q.type === "multi_select") {
      const picked = Array.isArray(ans) ? ans : null;
      grades.push(gradeMultiSelect(q, picked));
    }
  }
  return grades;
}

export function buildSpeciesAssessmentContext(species: ExploreSpeciesPayload): string {
  const parts = [
    `物种：${species.name}`,
    `学名：${species.scientificName}`,
    `分类：${species.taxon}`,
    `摘要：${species.summary}`,
    `栖息地：${species.habitat}`,
    `食性：${species.diet}`,
    `保护：${species.conservation}`,
    `正文：${species.bodyMarkdown.slice(0, 4000)}`,
    `身体结构：${species.bodyStructureMarkdown.slice(0, 2500)}`,
    `习性：${species.habitsMarkdown.slice(0, 2500)}`,
    `趣闻：${species.funFactsMarkdown.slice(0, 1500)}`,
  ];
  if (species.supplementSections?.length) {
    for (const sec of species.supplementSections.slice(0, 4)) {
      parts.push(`${sec.title}：${sec.bodyMarkdown.slice(0, 1200)}`);
    }
  }
  return parts.join("\n\n");
}

export function mergeAssessmentResult(
  paper: AssessmentPaper,
  objectiveGrades: QuestionGrade[],
): AssessmentResult {
  const byId = new Map<string, QuestionGrade>();
  for (const g of objectiveGrades) byId.set(g.id, g);

  const grades: QuestionGrade[] = paper.questions.map((q) => {
    const g = byId.get(q.id);
    return (
      g ?? {
        id: q.id,
        earned: 0,
        max: q.points,
        isCorrect: null,
        feedback: "未作答或未评分。",
      }
    );
  });

  const earned = grades.reduce((s, g) => s + g.earned, 0);
  const max = grades.reduce((s, g) => s + g.max, 0);
  const percent = max > 0 ? Math.round((earned / max) * 100) : 0;
  const tier = resolveTier(percent, paper.gradingStandard.tiers);

  return { earned, max, percent, tier, grades };
}
