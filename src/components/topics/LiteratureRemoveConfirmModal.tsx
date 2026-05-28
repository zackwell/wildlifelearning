"use client";

import { useEffect, useRef } from "react";
import { loadUserPreferences, saveUserPreferences } from "@/lib/user-preferences";

export const LITERATURE_REMOVE_SKIP_CONFIRM_KEY = "wl-literature-remove-skip-confirm";

export function shouldSkipLiteratureRemoveConfirm(): boolean {
  return loadUserPreferences().skipLiteratureRemoveConfirm;
}

export function setSkipLiteratureRemoveConfirm(skip: boolean): void {
  saveUserPreferences({ skipLiteratureRemoveConfirm: skip });
}

type Props = {
  open: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function LiteratureRemoveConfirmModal({ open, title, onConfirm, onCancel }: Props) {
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

  function confirm() {
    setSkipLiteratureRemoveConfirm(skipRef.current?.checked ?? false);
    onConfirm();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lit-remove-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-950/50 backdrop-blur-[1px]"
        aria-label="关闭"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-900/15 bg-white p-6 shadow-xl dark:border-red-100/10 dark:bg-stone-900">
        <h2 id="lit-remove-modal-title" className="text-lg font-semibold text-stone-900 dark:text-stone-50">
          确认移除文献？
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          将移除「{title}」及其检索索引与本地正文，此操作不可恢复。
        </p>
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
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 dark:bg-red-600"
          >
            确认移除
          </button>
        </div>
      </div>
    </div>
  );
}
