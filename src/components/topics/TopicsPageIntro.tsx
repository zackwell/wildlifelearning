"use client";

import { useEffect, useState } from "react";
import { shouldSkipTopicsGuideAuto } from "@/lib/topics/guide";
import { TopicsGuideModal } from "@/components/topics/TopicsGuideModal";

export function TopicsPageIntro() {
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    if (!shouldSkipTopicsGuideAuto()) setGuideOpen(true);
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950 dark:text-emerald-50">知识专题</h1>
          <p className="mt-2 max-w-2xl text-emerald-900/80 dark:text-emerald-100/80">
            上传并阅读你的文献资料，需要时在智能助手中引用这些内容来回答问题。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-800/25 bg-emerald-50/80 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100/80 dark:border-emerald-200/20 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-900/50"
        >
          <span aria-hidden className="text-base leading-none">
            ?
          </span>
          使用引导
        </button>
      </div>

      <TopicsGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}
