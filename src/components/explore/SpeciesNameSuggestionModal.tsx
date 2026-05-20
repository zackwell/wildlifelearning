"use client";

import type { SpeciesNameSuggestion } from "@/lib/species-query-suggestions";
import { useEffect } from "react";

type Props = {
  originalQuery: string;
  suggestion: SpeciesNameSuggestion;
  onAccept: (query: string) => void;
  onForceOriginal: () => void;
  onClose: () => void;
};

export function SpeciesNameSuggestionModal({
  originalQuery,
  suggestion,
  onAccept,
  onForceOriginal,
  onClose,
}: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="species-name-suggest-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-950/50 backdrop-blur-[2px]"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-amber-900/20 bg-white p-6 shadow-xl dark:border-amber-100/15 dark:bg-sky-950">
        <h3
          id="species-name-suggest-title"
          className="text-lg font-semibold text-amber-950 dark:text-amber-100"
        >
          是否想查询「{suggestion.suggestedQuery}」？
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-sky-900/90 dark:text-sky-100/85">
          你输入的是「{originalQuery}」。{suggestion.reason}
        </p>
        {suggestion.scientificNameHint ? (
          <p className="mt-2 text-xs italic text-sky-800/80 dark:text-sky-200/70">
            建议物种学名：{suggestion.scientificNameHint}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => onAccept(suggestion.suggestedQuery)}
          className="mt-5 w-full rounded-xl bg-sky-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 dark:bg-sky-600"
        >
          改用「{suggestion.suggestedQuery}」生成
        </button>
        <button
          type="button"
          onClick={onForceOriginal}
          className="mt-2 w-full rounded-xl border border-sky-800/25 py-2.5 text-sm font-medium text-sky-900 hover:bg-sky-50 dark:border-sky-200/20 dark:text-sky-100 dark:hover:bg-sky-900/40"
        >
          仍用「{originalQuery}」（可能不准确）
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full py-2 text-center text-xs text-sky-700/80 hover:underline dark:text-sky-300/80"
        >
          返回修改搜索词
        </button>
      </div>
    </div>
  );
}
