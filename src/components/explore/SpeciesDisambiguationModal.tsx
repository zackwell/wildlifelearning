"use client";

import type { SpeciesDisambiguation } from "@/lib/species-group-disambiguation-data";
import { useEffect, useState } from "react";

type Props = {
  data: SpeciesDisambiguation;
  originalQuery: string;
  onSelectSpecies: (query: string) => void;
  onGenericOverview: () => void;
  onClose: () => void;
};

export function SpeciesDisambiguationModal({
  data,
  originalQuery,
  onSelectSpecies,
  onGenericOverview,
  onClose,
}: Props) {
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherQuery, setOtherQuery] = useState("");

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

  function submitOther() {
    const q = otherQuery.trim();
    if (!q || q === originalQuery.trim()) return;
    onSelectSpecies(q);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="species-disambig-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-950/50 backdrop-blur-[2px]"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-sky-900/15 bg-white p-6 shadow-xl dark:border-sky-100/15 dark:bg-sky-950">
        <h3
          id="species-disambig-title"
          className="text-lg font-semibold text-sky-950 dark:text-sky-50"
        >
          {data.prompt}
        </h3>
        <p className="mt-1 text-sm text-sky-800/80 dark:text-sky-200/75">
          你输入的是「{originalQuery}」。选择具体物种可生成更准确的图鉴；也可查看类群概览。
        </p>

        <ul className="mt-4 space-y-2">
          {data.options.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => onSelectSpecies(opt.query)}
                className="flex w-full flex-col rounded-xl border border-sky-800/20 px-4 py-3 text-left transition hover:border-sky-600 hover:bg-sky-50 dark:border-sky-200/20 dark:hover:bg-sky-900/50"
              >
                <span className="font-semibold text-sky-950 dark:text-sky-50">{opt.label}</span>
                {opt.hint ? (
                  <span className="mt-0.5 text-xs italic text-sky-800/75 dark:text-sky-200/70">
                    {opt.hint}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
          <li>
            {!otherOpen ? (
              <button
                type="button"
                onClick={() => setOtherOpen(true)}
                className="w-full rounded-xl border border-dashed border-sky-800/30 px-4 py-3 text-left text-sm font-medium text-sky-900 hover:bg-sky-50 dark:border-sky-200/25 dark:text-sky-100 dark:hover:bg-sky-900/40"
              >
                其它（手动输入精确物种名）
              </button>
            ) : (
              <div className="rounded-xl border border-sky-800/20 bg-sky-50/80 p-3 dark:border-sky-200/20 dark:bg-sky-900/40">
                <label className="block text-xs font-medium text-sky-900 dark:text-sky-100">
                  物种名称
                </label>
                <input
                  value={otherQuery}
                  onChange={(e) => setOtherQuery(e.target.value)}
                  maxLength={80}
                  placeholder="例如：婆罗洲象"
                  className="mt-1 w-full rounded-lg border border-sky-900/15 bg-white px-3 py-2 text-sm dark:border-sky-100/15 dark:bg-sky-950"
                  autoFocus
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={submitOther}
                    disabled={!otherQuery.trim()}
                    className="rounded-lg bg-sky-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 dark:bg-sky-600"
                  >
                    生成图鉴
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtherOpen(false);
                      setOtherQuery("");
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs text-sky-800 dark:text-sky-200"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </li>
        </ul>

        {data.allowGeneric ? (
          <button
            type="button"
            onClick={onGenericOverview}
            className="mt-4 w-full rounded-xl border border-sky-800/25 py-2.5 text-sm font-medium text-sky-900 hover:bg-sky-100/60 dark:border-sky-200/20 dark:text-sky-100 dark:hover:bg-sky-900/40"
          >
            {data.genericLabel}
          </button>
        ) : null}

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
