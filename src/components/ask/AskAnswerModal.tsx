"use client";

import Link from "next/link";
import { MarkdownBody } from "@/components/MarkdownBody";
import {
  applySupplementMergePlan,
  findFieldGuideEntryForSpeciesKey,
  parseSupplementMergePlan,
} from "@/lib/field-guide-supplement";
import { updateFieldGuideEntrySpecies } from "@/lib/personal-field-guide";
import { useEffect, useState } from "react";

export type AskAnswerCitation = {
  id: string;
  excerpt: string;
  sourceTitle: string;
  sourcePath: string;
};

export type AskAnswerData = {
  answer: string;
  citations: AskAnswerCitation[];
  mode: string;
  rawQuestion?: string;
  resolvedQuestion?: string;
  speciesApplied?: boolean;
  speciesContext?: { name: string; scientificName?: string; slug?: string };
};

const MODE_HINT: Record<string, string> = {
  "rag-hybrid": "摘录优先，可在「（通识补充）」下结合常识",
  rag: "仅依据检索摘录由模型整理",
  "general-only": "未命中摘录：通识回答（非本站文献）",
  "general-error": "通识调用失败",
  empty: "无摘录且未调用或不允许通识模式",
  "keyword-only": "未配置模型：仅摘录列表",
  "error-fallback": "模型异常，保留摘录原文",
};

const cardClass =
  "rounded-2xl border border-stone-900/10 bg-gradient-to-br from-np-peach/30 to-white dark:border-white/10 dark:from-stone-900/80 dark:to-stone-950/60";

type Props = {
  result: AskAnswerData;
  question: string;
  resolvedQuestion: string;
  speciesKey: string;
  speciesName: string;
  showSupplementToFieldGuide: boolean;
  onClose: () => void;
};

export function AskAnswerModal({
  result,
  question,
  resolvedQuestion,
  speciesKey,
  speciesName,
  showSupplementToFieldGuide,
  onClose,
}: Props) {
  const [supplementStatus, setSupplementStatus] = useState<string | null>(null);
  const [supplementLoading, setSupplementLoading] = useState(false);
  const [supplementEntryId, setSupplementEntryId] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !supplementLoading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, supplementLoading]);

  async function onSupplementToFieldGuide() {
    setSupplementStatus(null);
    setSupplementEntryId(null);

    const lookupKey =
      speciesKey.trim() ||
      speciesName.trim() ||
      result.speciesContext?.name?.trim() ||
      "";
    if (!lookupKey) {
      setSupplementStatus("请先在表单中选择或填写「我的图鉴条目」，以便匹配你的图鉴。");
      return;
    }

    const entry = await findFieldGuideEntryForSpeciesKey(lookupKey);
    if (!entry) {
      setSupplementStatus(
        `未在「我的图鉴」中找到「${lookupKey}」。请先在图鉴主页搜索该动物并点击「加入我的图鉴」完成建档，再回来补充。`,
      );
      return;
    }

    setSupplementLoading(true);
    try {
      const res = await fetch("/api/field-guide/supplement-from-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          species: entry.species,
          question: resolvedQuestion.trim() || question,
          answer: result.answer,
        }),
      });
      const data = (await res.json()) as { error?: string; plan?: unknown };
      if (!res.ok) {
        setSupplementStatus(data.error ?? "整理并入失败");
        return;
      }
      const plan = parseSupplementMergePlan(data.plan);
      if (!plan) {
        setSupplementStatus("服务器返回的并入方案无效，请重试。");
        return;
      }

      const mergedSpecies = applySupplementMergePlan(entry.species, plan, resolvedQuestion || question);
      const updated = await updateFieldGuideEntrySpecies(entry.id, mergedSpecies);
      if (!updated) {
        setSupplementStatus("写入图鉴失败，请重试。");
        return;
      }

      const label = plan.categoryLabel;
      setSupplementEntryId(entry.id);
      setSupplementStatus(`已整理并并入「${entry.species.name}」的「${label}」。`);
    } catch {
      setSupplementStatus("网络错误，请稍后重试。");
    } finally {
      setSupplementLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ask-answer-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-950/55 backdrop-blur-[2px]"
        onClick={onClose}
        disabled={supplementLoading}
        aria-label="关闭回答窗口"
      />
      <div className="relative z-10 flex max-h-[min(90vh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-stone-900/15 bg-np-paper shadow-2xl dark:border-white/15 dark:bg-stone-900">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-stone-900/10 px-5 py-4 dark:border-white/10 sm:px-6">
          <div>
            <h2 id="ask-answer-title" className="text-xl font-bold text-stone-900 dark:text-stone-50 sm:text-2xl">
              回答
            </h2>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              模式：{result.mode}
              {MODE_HINT[result.mode] ? ` — ${MODE_HINT[result.mode]}` : ""}
            </p>
            {result.speciesApplied && result.resolvedQuestion ? (
              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
                已理解问题：{result.resolvedQuestion}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={supplementLoading}
            className="shrink-0 rounded-full border border-stone-900/15 bg-white/90 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-white disabled:opacity-60 dark:border-stone-100/20 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
          >
            关闭
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <div className={`${cardClass} p-5 sm:p-6`}>
            <MarkdownBody content={result.answer} className="text-base sm:text-lg" />
          </div>

          {result.citations.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-50">引用摘录</h3>
              <ul className="mt-3 space-y-3">
                {result.citations.map((c) => (
                  <li key={c.id} className={`${cardClass} p-4 text-base`}>
                    <Link
                      href={c.sourcePath}
                      className="font-medium text-stone-900 underline-offset-2 hover:text-np-terracotta hover:underline dark:text-stone-100 dark:hover:text-np-cream"
                    >
                      {c.sourceTitle}
                    </Link>
                    <span className="text-sm text-stone-600 dark:text-stone-400"> · {c.sourcePath}</span>
                    <p className="mt-2 text-justify leading-relaxed text-stone-700/90 dark:text-stone-200/85">
                      {c.excerpt}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <footer className="shrink-0 space-y-3 border-t border-stone-900/10 px-5 py-4 dark:border-white/10 sm:px-6">
          {supplementStatus ? (
            <p
              className={`text-sm leading-relaxed ${
                supplementEntryId
                  ? "text-emerald-800 dark:text-emerald-200"
                  : "text-amber-900 dark:text-amber-100"
              }`}
              role="status"
            >
              {supplementStatus}
              {supplementEntryId ? (
                <>
                  {" "}
                  <Link
                    href={`/my-field-guide/${supplementEntryId}`}
                    className="font-semibold underline-offset-2 hover:underline"
                  >
                    查看图鉴条目
                  </Link>
                </>
              ) : !supplementEntryId && supplementStatus.includes("未在") ? (
                <>
                  {" "}
                  <Link href="/main" className="font-semibold underline-offset-2 hover:underline">
                    去图鉴主页建档
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {showSupplementToFieldGuide ? (
              <button
                type="button"
                onClick={onSupplementToFieldGuide}
                disabled={supplementLoading}
                className="flex-1 rounded-full bg-np-cta py-3 text-base font-semibold text-np-cta-ink shadow-md transition hover:bg-np-cta-hover disabled:opacity-60 sm:flex-none sm:px-8"
              >
                {supplementLoading ? "整理并入中…" : "补充至图鉴"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              disabled={supplementLoading}
              className="rounded-full border border-stone-900/15 bg-white/90 px-6 py-3 text-base font-semibold text-stone-800 transition hover:bg-white disabled:opacity-60 dark:border-stone-100/20 dark:bg-stone-800 dark:text-stone-100"
            >
              关闭
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
