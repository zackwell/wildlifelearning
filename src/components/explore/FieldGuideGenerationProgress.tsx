"use client";

import { useEffect, useState } from "react";
import {
  DISAMBIGUATE_PROGRESS,
  FIELD_GUIDE_GENERATION_STAGES,
  GENERATION_STAGE_MS,
  type FieldGuideProgressPhase,
  stageProgressPercent,
} from "@/lib/explore-generation-progress";

type Props = {
  phase: FieldGuideProgressPhase;
  /** 当前搜索的动物名（可选，仅作上下文展示） */
  query?: string;
};

export function FieldGuideGenerationProgress({ phase, query }: Props) {
  const stages =
    phase === "disambiguate" ? [DISAMBIGUATE_PROGRESS] : FIELD_GUIDE_GENERATION_STAGES;
  const [stageIndex, setStageIndex] = useState(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setStageIndex(0);
  }, [phase, query]);

  useEffect(() => {
    if (phase !== "generate") return;
    const timer = window.setInterval(() => {
      setStageIndex((i) => (i < stages.length - 1 ? i + 1 : i));
    }, GENERATION_STAGE_MS);
    return () => window.clearInterval(timer);
  }, [phase, stages.length]);

  useEffect(() => {
    const t = window.setInterval(() => setPulse((p) => !p), 900);
    return () => window.clearInterval(t);
  }, []);

  const stage = stages[Math.min(stageIndex, stages.length - 1)]!;
  const percent = stageProgressPercent(stageIndex, stages.length);

  return (
    <div
      className="mt-6 overflow-hidden rounded-2xl border border-sky-800/15 bg-gradient-to-br from-sky-50/95 to-white p-6 shadow-sm dark:border-sky-200/15 dark:from-sky-950/70 dark:to-sky-950/40"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-start gap-4">
        <div
          className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-800/10 dark:bg-sky-400/10"
          aria-hidden
        >
          <span
            className="absolute inset-1 animate-spin rounded-full border-2 border-sky-600/30 border-t-sky-700 dark:border-sky-300/25 dark:border-t-sky-200"
            style={{ animationDuration: "1.1s" }}
          />
          <span className="text-lg">🦊</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-sky-950 dark:text-sky-50">
            {phase === "disambiguate" ? "准备生成图鉴" : "正在生成图鉴"}
            {query ? (
              <span className="font-normal text-sky-800/85 dark:text-sky-200/85">
                {" "}
                · {query}
              </span>
            ) : null}
          </p>

          <p
            key={`${phase}-${stageIndex}-${stage.label}`}
            className="mt-2 animate-[fadeIn_0.45s_ease-out] text-base font-medium text-sky-900 dark:text-sky-100"
          >
            {stage.label}
            <span className="inline-flex w-6 justify-start">
              <span className={pulse ? "opacity-100" : "opacity-30"}>.</span>
              <span className={pulse ? "opacity-70" : "opacity-20"}>.</span>
              <span className={pulse ? "opacity-40" : "opacity-10"}>.</span>
            </span>
          </p>
          <p className="mt-1 text-xs text-sky-800/75 dark:text-sky-300/75">{stage.hint}</p>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-sky-900/10 dark:bg-sky-100/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-500 transition-[width] duration-700 ease-out dark:from-sky-500 dark:to-sky-400"
              style={{ width: `${percent}%` }}
            />
          </div>

          {phase === "generate" && stages.length > 1 ? (
            <p className="mt-2 text-[11px] tabular-nums text-sky-700/70 dark:text-sky-300/60">
              步骤 {stageIndex + 1} / {stages.length}
            </p>
          ) : null}

          <p className="mt-3 text-xs leading-relaxed text-sky-800/65 dark:text-sky-300/60">
            首次生成可能需要半分钟到一分钟，请稍候；冷门物种内容可能较简略。
          </p>
        </div>
      </div>
    </div>
  );
}
