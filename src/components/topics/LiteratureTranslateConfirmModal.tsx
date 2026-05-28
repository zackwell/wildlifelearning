"use client";

import { useEffect, useRef } from "react";
import {
  literatureRagModalCopy,
  setSkipLiteratureRagConfirm,
} from "@/lib/literature/rag-labels";

type Props = {
  open: boolean;
  predominantlyChinese: boolean;
  zhRagReady: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function LiteratureTranslateConfirmModal({
  open,
  predominantlyChinese,
  zhRagReady,
  onConfirm,
  onCancel,
}: Props) {
  const skipRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const { title, body } = literatureRagModalCopy({ predominantlyChinese, zhRagReady });

  function confirm() {
    setSkipLiteratureRagConfirm(skipRef.current?.checked ?? false);
    onConfirm();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lit-rag-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-950/50 backdrop-blur-[1px]"
        aria-label="关闭"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-emerald-900/15 bg-white p-6 shadow-xl dark:border-emerald-100/10 dark:bg-stone-900">
        <h2 id="lit-rag-modal-title" className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{body}</p>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
          <input ref={skipRef} type="checkbox" className="rounded border-stone-300" />
          以后不再提醒
        </label>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            取消
          </button>
          <button
            type="button"
            onClick={confirm}
            className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-600"
          >
            开始处理
          </button>
        </div>
      </div>
    </div>
  );
}
