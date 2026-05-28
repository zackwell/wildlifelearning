"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  email: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (currentPassword: string) => void;
};

export function DeleteAccountModal({ open, email, busy, error, onCancel, onConfirm }: Props) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) {
      setPassword("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-950/50 backdrop-blur-[1px]"
        aria-label="关闭"
        onClick={() => {
          if (!busy) onCancel();
        }}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-900/15 bg-white p-6 shadow-xl dark:border-red-100/10 dark:bg-stone-900">
        <h2 id="delete-account-title" className="text-lg font-semibold text-stone-900 dark:text-stone-50">
          确认注销账户？
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          将永久删除账号 <strong className="text-stone-800 dark:text-stone-100">{email}</strong>
          及其云端图鉴、题库、文献与检索数据，且无法恢复。
        </p>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-200">当前密码</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-stone-300/80 bg-white/90 px-4 py-2.5 text-stone-900 outline-none ring-red-500/20 focus:border-red-500 focus:ring-2 dark:border-stone-600 dark:bg-stone-950/50 dark:text-stone-50"
            autoComplete="current-password"
            disabled={busy}
          />
        </label>
        {error ? (
          <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm(password)}
            disabled={busy || !password.trim()}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60 dark:bg-red-600"
          >
            {busy ? "注销中…" : "确认注销"}
          </button>
        </div>
      </div>
    </div>
  );
}
