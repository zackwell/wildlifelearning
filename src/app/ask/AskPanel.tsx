"use client";

import Image from "next/image";
import { memo, useEffect, useState } from "react";
import { AskAnswerModal } from "@/components/ask/AskAnswerModal";
import {
  getAskDraft,
  patchAskDraft,
  patchAskInput,
  patchAskResult,
  useAskResult,
} from "@/lib/client-session-cache";
import { toucanHero } from "@/lib/nature-images";
import { enabledLiteratureIds } from "@/lib/user-literature";

const fieldClass =
  "mt-2 w-full rounded-xl border border-stone-900/10 bg-white/90 px-4 py-3 text-base text-stone-900 shadow-sm outline-none ring-np-cta/30 placeholder:text-stone-500 focus:border-np-cta focus:ring-2 dark:border-stone-100/15 dark:bg-stone-950/50 dark:text-stone-50 dark:placeholder:text-stone-400";

const cardClass =
  "rounded-2xl border border-stone-900/10 bg-gradient-to-br from-np-peach/40 to-white shadow-sm dark:border-white/10 dark:from-stone-900/80 dark:to-stone-950/60";

const labelClass = "text-base font-medium text-stone-900 dark:text-stone-100";
const bodyClass = "text-base leading-relaxed text-stone-700/90 dark:text-stone-200/85";

const AskResultPanel = memo(function AskResultPanel() {
  const result = useAskResult();
  if (!result) return null;

  const { fieldGuideKey, question } = getAskDraft();
  return (
    <AskAnswerModal
      result={result}
      question={question}
      speciesKey={fieldGuideKey}
      onClose={() => patchAskResult({ result: null })}
    />
  );
});

export function AskPanel() {
  const [fieldGuideKey, setFieldGuideKey] = useState(() => getAskDraft().fieldGuideKey);
  const [question, setQuestion] = useState(() => getAskDraft().question);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      patchAskInput({ fieldGuideKey, question });
    };
  }, [fieldGuideKey, question]);

  function syncAskInput(nextFieldGuideKey = fieldGuideKey, nextQuestion = question) {
    patchAskInput({ fieldGuideKey: nextFieldGuideKey, question: nextQuestion });
  }

  function onClear() {
    setFieldGuideKey("");
    setQuestion("");
    patchAskDraft({ fieldGuideKey: "", question: "", result: null });
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    syncAskInput();
    patchAskResult({ result: null });
    setLoading(true);
    try {
      const literatureIds = await enabledLiteratureIds();
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, literatureIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "请求失败");
        return;
      }
      patchAskResult({ result: data });
    } catch {
      setError("网络错误，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 space-y-7 text-left">
      <div className="relative mt-16 sm:mt-20">
        <div
          className="pointer-events-none absolute -right-1 z-20 h-[8.5rem] w-[6.25rem] sm:-right-2 sm:h-[10.5rem] sm:w-[7.5rem]"
          style={{ bottom: "calc(100% - 1.8rem)" }}
          aria-hidden
        >
          <Image
            src={toucanHero}
            alt=""
            className="h-full w-full object-contain object-bottom"
            sizes="104px"
            priority
          />
        </div>
        <section className={`${cardClass} relative z-10 px-5 py-4`}>
          <p className={`font-semibold ${labelClass}`}>重要提示：</p>
          <p className={`mx-auto mt-1 max-w-[32rem] text-justify [text-align-last:center] ${bodyClass}`}>
            图鉴未回答的小知识可以在这里提问并补充到我的图鉴中。本站问答仅用于科普，不构成兽医诊断、治疗或野外急救指导。
          </p>
        </section>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <label className="block">
          <span className={labelClass}>我的图鉴条目（可选，用于「补充至图鉴」）</span>
          <input
            id="field-guide-key"
            className={fieldClass}
            placeholder="物种名称须已在「我的图鉴」中"
            value={fieldGuideKey}
            onChange={(e) => setFieldGuideKey(e.target.value)}
            onBlur={() => syncAskInput()}
          />
        </label>
        <label className="block">
          <span className={labelClass}>您的问题：</span>
          <textarea
            id="q"
            required
            rows={5}
            maxLength={800}
            className={fieldClass}
            placeholder="例如：长颈鹿有几块颈骨？"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onBlur={() => syncAskInput()}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-np-cta py-4 text-base font-semibold text-np-cta-ink shadow-md transition hover:bg-np-cta-hover disabled:opacity-60"
          >
            {loading ? "检索中…" : "提交"}
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={loading}
            className="w-full rounded-xl border border-stone-900/15 bg-white/90 py-4 text-base font-semibold text-stone-800 transition hover:bg-white disabled:opacity-60 dark:border-stone-100/20 dark:bg-stone-800/50 dark:text-stone-100 dark:hover:bg-stone-800"
          >
            清空
          </button>
        </div>
        {error ? (
          <p className="text-sm text-red-700 dark:text-red-300" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <AskResultPanel />
    </div>
  );
}
