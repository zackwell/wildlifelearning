"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type {
  AssessmentPaper,
  AssessmentQuestion,
  AssessmentResult,
  UserAnswers,
} from "@/lib/field-guide-assessment";
import {
  gradeObjectiveQuestions,
  mergeAssessmentResult,
} from "@/lib/field-guide-assessment";
import type { FieldGuideSavedEntry } from "@/lib/personal-field-guide";
import { getFieldGuideEntry } from "@/lib/personal-field-guide";
import { saveQuestionsToBank } from "@/lib/question-bank";

type Phase = "intro" | "generating" | "exam" | "results";

function typeLabel(type: AssessmentQuestion["type"]): string {
  if (type === "choice") return "选择题";
  if (type === "true_false") return "判断题";
  return "思维多选";
}

function toggleMultiSelect(
  prev: UserAnswers,
  qid: string,
  idx: number,
): UserAnswers {
  const cur = Array.isArray(prev[qid]) ? [...(prev[qid] as number[])] : [];
  const pos = cur.indexOf(idx);
  if (pos >= 0) cur.splice(pos, 1);
  else cur.push(idx);
  cur.sort((a, b) => a - b);
  return { ...prev, [qid]: cur };
}

export function FieldGuideLearnClient({ id }: { id: string }) {
  const [entry, setEntry] = useState<FieldGuideSavedEntry | null | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>("intro");
  const [paper, setPaper] = useState<AssessmentPaper | null>(null);
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saveHint, setSaveHint] = useState<string | null>(null);

  useEffect(() => {
    void getFieldGuideEntry(id).then((e) => {
      setEntry(e ?? null);
      setPhase("intro");
      setPaper(null);
      setAnswers({});
      setResult(null);
      setError(null);
      setExpandedIds(new Set());
      setSelectedIds(new Set());
      setSaveHint(null);
    });
  }, [id]);

  const startAssessment = useCallback(async () => {
    if (!entry) return;
    setError(null);
    setPhase("generating");
    try {
      const res = await fetch("/api/field-guide/generate-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ species: entry.species }),
        credentials: "same-origin",
      });
      const json = (await res.json()) as { paper?: AssessmentPaper; error?: string };
      if (!res.ok) throw new Error(json.error ?? `请求失败（HTTP ${res.status}）`);
      if (!json.paper) throw new Error("未返回试卷数据。");
      setPaper(json.paper);
      setAnswers({});
      setPhase("exam");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("intro");
    }
  }, [entry]);

  async function submitExam() {
    if (!paper || !entry) return;

    const unanswered = paper.questions.filter((q) => {
      const a = answers[q.id];
      if (q.type === "multi_select") return !Array.isArray(a) || a.length === 0;
      if (q.type === "choice") return typeof a !== "number";
      return typeof a !== "boolean";
    });
    if (unanswered.length > 0) {
      setError(`还有 ${unanswered.length} 道题未作答，请完成后再提交。`);
      return;
    }

    setError(null);
    const objective = gradeObjectiveQuestions(paper, answers);
    const merged = mergeAssessmentResult(paper, objective);
    setResult(merged);
    setSelectedIds(new Set(paper.questions.map((q) => q.id)));
    setExpandedIds(new Set(paper.questions.map((q) => q.id)));
    setPhase("results");
  }

  function toggleExpand(qid: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  }

  async function saveToBank() {
    if (!paper || !entry) return;
    try {
      const saved = await saveQuestionsToBank({
        fieldGuideId: id,
        speciesName: entry.species.name,
        paper,
        questionIds: [...selectedIds],
      });
      setSaveHint(`已保存 ${saved.questions.length} 道题至「我的题库」。`);
    } catch (e) {
      setSaveHint(e instanceof Error ? e.message : "保存失败");
    }
  }

  if (entry === undefined) {
    return <p className="text-sm text-emerald-800/80 dark:text-emerald-200/75">加载中…</p>;
  }

  if (!entry) {
    return (
      <div className="space-y-3">
        <p>未找到条目。</p>
        <Link href="/my-field-guide" className="text-sm font-medium text-emerald-800 underline dark:text-emerald-300">
          返回我的图鉴
        </Link>
      </div>
    );
  }

  const s = entry.species;

  return (
    <div className="space-y-8">
      <nav className="text-sm text-emerald-800/80 dark:text-emerald-200/75">
        <Link href="/my-field-guide" className="hover:underline">
          我的图鉴
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/my-field-guide/${id}`} className="hover:underline">
          {s.name}
        </Link>
        <span className="mx-2">/</span>
        <span>学习检测</span>
      </nav>

      <header>
        <h1 className="text-2xl font-bold text-emerald-950 dark:text-emerald-50">学习检测 · {s.name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-emerald-900/85 dark:text-emerald-100/80">
          基于本条图鉴正文，由 AI 生成选择题、判断题与思维多选题（勾选即可，无需长文作答）；提交后自动计分，可查看逐题解析，并将题目存入「我的题库」。
        </p>
      </header>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200" role="alert">
          {error}
        </p>
      ) : null}

      {phase === "intro" ? (
        <div className="max-w-2xl space-y-4 rounded-2xl border border-emerald-900/10 bg-white/90 p-6 dark:border-emerald-100/10 dark:bg-emerald-950/35">
          <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">考核说明</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-emerald-900/90 dark:text-emerald-100/85">
            <li>题目覆盖分类、形态、习性、保护与综合思辨</li>
            <li>思维题采用「不定项多选」，点选你认为合理的选项即可</li>
            <li>全部题目自动计分，展示等级（优秀 / 良好 / 及格 / 待加强）与逐题解析</li>
            <li>可将本次题目勾选保存至「我的题库」便于复习</li>
          </ul>
          <button
            type="button"
            onClick={() => void startAssessment()}
            className="rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-600"
          >
            开始 AI 全面考核
          </button>
        </div>
      ) : null}

      {phase === "generating" ? (
        <div className="rounded-2xl border border-emerald-900/10 bg-emerald-50/60 px-6 py-10 text-center dark:border-emerald-100/10 dark:bg-emerald-950/40">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            正在根据图鉴生成试卷…
          </p>
          <p className="mt-2 text-xs text-emerald-800/70 dark:text-emerald-200/65">通常需要 15–40 秒</p>
        </div>
      ) : null}

      {phase === "exam" && paper ? (
        <div className="space-y-6">
          <p className="text-sm text-emerald-800/80 dark:text-emerald-200/75">
            共 {paper.questions.length} 题 · 满分{" "}
            {paper.questions.reduce((sum, q) => sum + q.points, 0)} 分
          </p>
          {paper.questions.map((q, qi) => (
            <fieldset
              key={q.id}
              className="rounded-xl border border-emerald-900/10 bg-white/90 p-4 dark:border-emerald-100/10 dark:bg-emerald-950/35"
            >
              <legend className="flex flex-wrap items-center gap-2 text-sm font-semibold text-emerald-950 dark:text-emerald-50">
                <span>第 {qi + 1} 题</span>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100">
                  {typeLabel(q.type)} · {q.points} 分
                </span>
              </legend>
              <p className="mt-2 text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">{q.question}</p>

              {q.type === "choice" && q.options ? (
                <ul className="mt-3 space-y-2">
                  {q.options.map((opt, oi) => (
                    <li key={oi}>
                      <label className="flex cursor-pointer items-start gap-2 text-sm text-emerald-900 dark:text-emerald-100">
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={answers[q.id] === oi}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                          className="mt-1"
                        />
                        <span>{opt}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : null}

              {q.type === "true_false" ? (
                <div className="mt-3 flex flex-wrap gap-4">
                  {[
                    { val: true, label: "正确" },
                    { val: false, label: "错误" },
                  ].map(({ val, label }) => (
                    <label
                      key={label}
                      className="flex cursor-pointer items-center gap-2 text-sm text-emerald-900 dark:text-emerald-100"
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={answers[q.id] === val}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: val }))}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              ) : null}

              {q.type === "multi_select" && q.multiOptions ? (
                <div className="mt-3">
                  <p className="mb-2 text-xs text-emerald-800/75 dark:text-emerald-200/70">
                    可多选 · 选出所有你认为合理的选项
                  </p>
                  <ul className="space-y-2">
                    {q.multiOptions.map((opt, oi) => {
                      const picked = Array.isArray(answers[q.id]) ? (answers[q.id] as number[]) : [];
                      return (
                        <li key={oi}>
                          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-emerald-900/10 px-3 py-2 text-sm text-emerald-900 transition hover:bg-emerald-50/80 dark:border-emerald-100/10 dark:text-emerald-100 dark:hover:bg-emerald-900/30">
                            <input
                              type="checkbox"
                              checked={picked.includes(oi)}
                              onChange={() =>
                                setAnswers((prev) => toggleMultiSelect(prev, q.id, oi))
                              }
                              className="mt-0.5"
                            />
                            <span>{opt}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </fieldset>
          ))}
          <button
            type="button"
            onClick={() => void submitExam()}
            className="rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-600"
          >
            提交答卷
          </button>
        </div>
      ) : null}

      {phase === "results" && paper && result ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-800/20 bg-emerald-50/80 p-6 dark:border-emerald-200/15 dark:bg-emerald-950/40">
            <p className="text-2xl font-bold text-emerald-950 dark:text-emerald-50">
              {result.tier.label} · {result.percent}%
            </p>
            <p className="mt-1 text-sm text-emerald-900/85 dark:text-emerald-100/80">
              得分 {result.earned} / {result.max} · {result.tier.description}
            </p>
            <p className="mt-3 text-xs text-emerald-800/75 dark:text-emerald-200/70">
              {paper.gradingStandard.summary}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {paper.gradingStandard.tiers.map((t) => (
                <span
                  key={t.label}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                    t.label === result.tier.label
                      ? "bg-emerald-800 text-white dark:bg-emerald-600"
                      : "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                  }`}
                >
                  {t.label} ≥{t.minPercent}%
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">逐题解析</h2>
            {paper.questions.map((q, qi) => {
              const g = result.grades.find((x) => x.id === q.id);
              const expanded = expandedIds.has(q.id);
              const ok = g?.isCorrect;
              return (
                <div
                  key={q.id}
                  className="rounded-xl border border-emerald-900/10 bg-white/90 dark:border-emerald-100/10 dark:bg-emerald-950/35"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(q.id)}
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-emerald-800/70 dark:text-emerald-200/65">
                        第 {qi + 1} 题 · {typeLabel(q.type)} · {g?.earned ?? 0}/{g?.max ?? q.points} 分
                      </p>
                      <p className="mt-1 text-sm font-medium text-emerald-950 dark:text-emerald-50">{q.question}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${
                        ok === true
                          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50"
                          : ok === false
                            ? "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200"
                            : "bg-amber-100 text-amber-900 dark:bg-amber-950/40"
                      }`}
                    >
                      {ok === true ? "正确" : ok === false ? "错误" : "部分"}
                    </span>
                  </button>
                  {expanded ? (
                    <div className="border-t border-emerald-900/10 px-4 py-3 text-sm dark:border-emerald-100/10">
                      {q.type === "choice" && q.options ? (
                        <p className="text-emerald-900/85 dark:text-emerald-100/80">
                          正确答案：{q.options[q.correctIndex!]}
                        </p>
                      ) : null}
                      {q.type === "true_false" ? (
                        <p className="text-emerald-900/85 dark:text-emerald-100/80">
                          正确答案：{q.correctTrueFalse ? "正确" : "错误"}
                        </p>
                      ) : null}
                      {q.type === "multi_select" && q.multiOptions ? (
                        <div className="space-y-1 text-emerald-900/85 dark:text-emerald-100/80">
                          <p>
                            <span className="font-medium">应选：</span>
                            {(q.correctIndices ?? [])
                              .map((i) => q.multiOptions![i])
                              .filter(Boolean)
                              .join("；")}
                          </p>
                          <p>
                            <span className="font-medium">你的选择：</span>
                            {Array.isArray(answers[q.id]) && (answers[q.id] as number[]).length > 0
                              ? (answers[q.id] as number[])
                                  .map((i) => q.multiOptions![i])
                                  .filter(Boolean)
                                  .join("；")
                              : "（未选）"}
                          </p>
                        </div>
                      ) : null}
                      <p className="mt-2 text-emerald-900 dark:text-emerald-100">
                        <span className="font-medium">解析：</span>
                        {q.explanation}
                      </p>
                      {g?.feedback ? (
                        <p className="mt-2 text-emerald-800/85 dark:text-emerald-200/80">
                          <span className="font-medium">评语：</span>
                          {g.feedback}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-emerald-900/10 bg-white/90 p-5 dark:border-emerald-100/10 dark:bg-emerald-950/35">
            <h2 className="text-base font-semibold text-emerald-950 dark:text-emerald-50">存入我的题库</h2>
            <p className="mt-1 text-xs text-emerald-800/75 dark:text-emerald-200/70">
              勾选要保留的题目，可在「我的题库」中随时复习。
            </p>
            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {paper.questions.map((q, qi) => (
                <li key={q.id}>
                  <label className="flex cursor-pointer items-start gap-2 text-sm text-emerald-900 dark:text-emerald-100">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(q.id)}
                      onChange={() =>
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(q.id)) next.delete(q.id);
                          else next.add(q.id);
                          return next;
                        })
                      }
                      className="mt-1"
                    />
                    <span className="line-clamp-2">
                      第 {qi + 1} 题 [{typeLabel(q.type)}] {q.question}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveToBank}
                disabled={selectedIds.size === 0}
                className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-600"
              >
                保存选中题目到题库
              </button>
              <Link
                href="/my-question-bank"
                className="inline-flex items-center rounded-xl border border-emerald-800/30 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100/60 dark:border-emerald-200/25 dark:text-emerald-100"
              >
                查看我的题库
              </Link>
            </div>
            {saveHint ? <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">{saveHint}</p> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/my-field-guide/${id}`}
              className="rounded-lg border border-emerald-800/30 px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-100/60 dark:border-emerald-200/25 dark:text-emerald-100"
            >
              返回图鉴条目
            </Link>
            <button
              type="button"
              onClick={() => {
                setPhase("intro");
                setPaper(null);
                setAnswers({});
                setResult(null);
                setError(null);
              }}
              className="rounded-lg bg-emerald-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-600"
            >
              重新考核
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
