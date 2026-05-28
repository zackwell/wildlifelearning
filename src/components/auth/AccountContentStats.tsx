"use client";

import Link from "next/link";
import type { UserContentStats } from "@/lib/user-data/stats-server";

const statItems: {
  href: string;
  label: string;
  primary: (s: UserContentStats) => string;
  secondary: (s: UserContentStats) => string;
}[] = [
  {
    href: "/my-field-guide",
    label: "我的图鉴",
    primary: (s) => `${s.fieldGuides} 条物种图鉴`,
    secondary: (s) => {
      if (s.fieldGuides === 0) return "探索动物后可加入图鉴";
      if (s.fieldGuidesStarred > 0) return `其中 ${s.fieldGuidesStarred} 条已星标`;
      return "暂无星标条目";
    },
  },
  {
    href: "/my-question-bank",
    label: "我的题库",
    primary: (s) => `${s.questionSets} 组练习题`,
    secondary: (s) => {
      if (s.questionSets === 0) return "学习检测后可保存题目";
      return `共 ${s.questions} 道题`;
    },
  },
  {
    href: "/topics",
    label: "知识专题",
    primary: (s) => `${s.literature} 篇文献`,
    secondary: (s) => {
      if (s.literature === 0) return "可上传 PDF、Word 等资料";
      return `${s.literatureEnabledForAsk} 篇参与智能助手检索`;
    },
  },
];

type Props = {
  stats: UserContentStats;
};

export function AccountContentStats({ stats }: Props) {
  const totalItems = stats.fieldGuides + stats.questionSets + stats.literature;

  return (
    <section className="rounded-2xl border border-stone-900/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-stone-900/50">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">我的内容</h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            已加入 {totalItems} 项学习资料（云端同步）
          </p>
        </div>
        <p className="text-3xl font-bold tabular-nums text-np-terracotta dark:text-np-cream">{totalItems}</p>
      </div>

      <ul className="mt-5 grid gap-3 sm:grid-cols-3">
        {statItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex h-full flex-col rounded-xl border border-stone-200/80 px-4 py-4 transition hover:border-np-cta/40 hover:bg-np-peach/30 dark:border-stone-700 dark:hover:bg-stone-800/50"
              >
                <span className="text-sm font-medium text-stone-500 dark:text-stone-400">{item.label}</span>
                <span className="mt-2 text-lg font-semibold text-stone-900 dark:text-stone-100">
                  {item.primary(stats)}
                </span>
                <span className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                  {item.secondary(stats)}
                </span>
              </Link>
            </li>
          ))}
      </ul>
    </section>
  );
}
