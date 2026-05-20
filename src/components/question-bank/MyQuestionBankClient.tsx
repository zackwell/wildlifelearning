"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { loadQuestionBankSets, removeQuestionBankSet, type QuestionBankSet } from "@/lib/question-bank";
import {
  getQuestionBankListCache,
  removeQuestionBankListCacheItem,
  setQuestionBankListCache,
  setQuestionBankOpenId,
  useQuestionBankListCache,
  useQuestionBankOpenId,
} from "@/lib/client-session-cache";

function typeLabel(type: string): string {
  if (type === "choice") return "选择题";
  if (type === "true_false") return "判断题";
  if (type === "multi_select") return "思维多选";
  return "思维多选";
}

export function MyQuestionBankClient() {
  const listCache = useQuestionBankListCache();
  const openId = useQuestionBankOpenId();
  const [sets, setSets] = useState<QuestionBankSet[]>(() => getQuestionBankListCache() ?? []);
  const [ready, setReady] = useState(() => getQuestionBankListCache() !== null);

  const refresh = useCallback(() => {
    void loadQuestionBankSets().then((list) => {
      setSets(list);
      setQuestionBankListCache(list);
    });
  }, []);

  useEffect(() => {
    if (listCache) setSets(listCache);
  }, [listCache]);

  useEffect(() => {
    setReady(true);
    refresh();
  }, [refresh]);

  function onToggleOpen(id: string) {
    const next = openId === id ? null : id;
    setQuestionBankOpenId(next);
  }

  function onRemove(id: string) {
    if (!confirm("确定删除这一组题目？")) return;
    void removeQuestionBankSet(id).then(() => {
      removeQuestionBankListCacheItem(id);
      if (openId === id) setQuestionBankOpenId(null);
      refresh();
    });
  }

  if (!ready && sets.length === 0) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-emerald-950 dark:text-emerald-50">我的题库</h1>
        </header>
        <p className="text-sm text-emerald-800/80 dark:text-emerald-200/75">加载中…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-emerald-950 dark:text-emerald-50">我的题库</h1>
        <p className="mt-2 max-w-2xl text-sm text-emerald-900/85 dark:text-emerald-100/80">
          保存在学习检测中勾选的题目，便于按物种复习。登录后同步至云端。
        </p>
      </header>

      {sets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-emerald-800/25 bg-emerald-50/50 px-6 py-10 text-center dark:border-emerald-200/15 dark:bg-emerald-950/30">
          <p className="text-sm text-emerald-900/85 dark:text-emerald-100/80">暂无保存的题目。</p>
          <p className="mt-2 text-xs text-emerald-800/70 dark:text-emerald-200/65">
            在「我的图鉴 → 学习检测」完成考核后，可将题目存入此处。
          </p>
          <Link
            href="/my-field-guide"
            className="mt-4 inline-flex rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-600"
          >
            前往我的图鉴
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {sets.map((set) => {
            const open = openId === set.id;
            return (
              <li
                key={set.id}
                className="rounded-2xl border border-emerald-900/10 bg-white/90 dark:border-emerald-100/10 dark:bg-emerald-950/35"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-semibold text-emerald-950 dark:text-emerald-50">{set.speciesName}</p>
                    <p className="mt-1 text-xs text-emerald-800/75 dark:text-emerald-200/70">
                      {set.questions.length} 道题 · 保存于 {new Date(set.savedAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/my-field-guide/${set.fieldGuideId}`}
                      className="rounded-lg border border-emerald-800/25 px-3 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100/60 dark:text-emerald-100"
                    >
                      查看图鉴
                    </Link>
                    <button
                      type="button"
                      onClick={() => onToggleOpen(set.id)}
                      className="rounded-lg bg-emerald-800 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-600"
                    >
                      {open ? "收起" : "展开题目"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(set.id)}
                      className="rounded-lg border border-red-300/50 px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-50 dark:border-red-900/40 dark:text-red-200"
                    >
                      删除
                    </button>
                  </div>
                </div>
                {open ? (
                  <div className="border-t border-emerald-900/10 px-5 py-4 dark:border-emerald-100/10">
                    <ol className="space-y-4">
                      {set.questions.map((q, i) => (
                        <li key={q.id} className="text-sm">
                          <p className="font-medium text-emerald-950 dark:text-emerald-50">
                            {i + 1}. [{typeLabel(q.type)}] {q.question}
                          </p>
                          {q.type === "multi_select" && q.multiOptions ? (
                            <ul className="mt-1 list-inside list-disc text-emerald-900/85 dark:text-emerald-100/80">
                              {q.multiOptions.map((o, idx) => (
                                <li key={o}>
                                  {q.correctIndices?.includes(idx) ? "✓ " : ""}
                                  {o}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {q.type === "choice" && q.options ? (
                            <ul className="mt-1 list-inside list-disc text-emerald-900/85 dark:text-emerald-100/80">
                              {q.options.map((o) => (
                                <li key={o}>{o}</li>
                              ))}
                            </ul>
                          ) : null}
                          <p className="mt-1 text-emerald-800/80 dark:text-emerald-200/75">解析：{q.explanation}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
