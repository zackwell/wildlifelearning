import type { AssessmentPaper, AssessmentQuestion, GradingTier } from "@/lib/field-guide-assessment";

const STORAGE_KEY = "wl-question-bank-v1";
const MAX_SETS = 50;

export type QuestionBankSet = {
  id: string;
  savedAt: string;
  fieldGuideId: string;
  speciesName: string;
  title: string;
  questions: AssessmentQuestion[];
  gradingStandard: {
    summary: string;
    tiers: GradingTier[];
  };
};

function safeParse(raw: string | null): QuestionBankSet[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter(isValidSet);
  } catch {
    return [];
  }
}

function isValidSet(x: unknown): x is QuestionBankSet {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.savedAt === "string" &&
    typeof o.fieldGuideId === "string" &&
    typeof o.speciesName === "string" &&
    Array.isArray(o.questions) &&
    o.questions.length > 0
  );
}

function persistLocal(sets: QuestionBankSet[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
}

function loadLocalSets(): QuestionBankSet[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY)).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
}

export async function loadQuestionBankSets(): Promise<QuestionBankSet[]> {
  try {
    const res = await fetch("/api/user/question-bank", { credentials: "same-origin" });
    if (res.status === 401) return loadLocalSets();
    if (!res.ok) throw new Error();
    const data = (await res.json()) as { sets: QuestionBankSet[] };
    return data.sets;
  } catch {
    return loadLocalSets();
  }
}

export async function saveQuestionsToBank(opts: {
  fieldGuideId: string;
  speciesName: string;
  paper: AssessmentPaper;
  questionIds: string[];
}): Promise<QuestionBankSet> {
  const selected = opts.paper.questions.filter((q) => opts.questionIds.includes(q.id));
  if (selected.length === 0) {
    throw new Error("请至少选择一道题目。");
  }

  const entry: QuestionBankSet = {
    id: crypto.randomUUID?.() ?? `qb-${Date.now()}`,
    savedAt: new Date().toISOString(),
    fieldGuideId: opts.fieldGuideId,
    speciesName: opts.speciesName,
    title: opts.paper.title,
    questions: selected,
    gradingStandard: opts.paper.gradingStandard,
  };

  try {
    const res = await fetch("/api/user/question-bank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ set: entry }),
    });
    if (res.ok) {
      const data = (await res.json()) as { set: QuestionBankSet };
      return data.set;
    }
    if (res.status !== 401) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "保存失败");
    }
  } catch (e) {
    if (e instanceof Error && e.message !== "保存失败" && !e.message.includes("题库")) throw e;
  }

  if (typeof window === "undefined") throw new Error("题库仅可在浏览器中保存。");
  const prev = loadLocalSets();
  persistLocal([entry, ...prev].slice(0, MAX_SETS));
  return entry;
}

export async function removeQuestionBankSet(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/user/question-bank/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (res.ok) return;
    if (res.status !== 401) return;
  } catch {
    /* local */
  }
  if (typeof window === "undefined") return;
  persistLocal(loadLocalSets().filter((s) => s.id !== id));
}

export function readLocalQuestionSetsForMigration(): QuestionBankSet[] {
  return loadLocalSets();
}
