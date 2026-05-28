"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthHeaderActions } from "@/components/auth/AuthHeaderActions";

const nav = [
  { href: "/main", label: "首页" },
  { href: "/my-field-guide", label: "我的图鉴" },
  { href: "/my-question-bank", label: "我的题库" },
  { href: "/topics", label: "知识专题" },
  { href: "/ask", label: "智能助手" },
  { href: "/guide", label: "使用说明" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-stone-900/10 bg-np-paper/95 backdrop-blur-md dark:border-white/10 dark:bg-stone-950/90">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/main" className="group flex flex-col leading-tight">
          <span className="text-lg font-bold tracking-tight text-np-terracotta dark:text-np-cream">Nature+</span>
          <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-200">智能图鉴</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-stone-700 dark:text-stone-200">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                pathname === item.href
                  ? "rounded-md px-1 py-0.5 text-np-terracotta underline decoration-2 underline-offset-4 dark:text-np-cream"
                  : "rounded-md px-1 py-0.5 hover:text-np-terracotta hover:underline dark:hover:text-np-cream"
              }
            >
              {item.label}
            </Link>
          ))}
          <span className="hidden h-4 w-px bg-stone-300 sm:block dark:bg-stone-600" aria-hidden />
          <AuthHeaderActions />
        </nav>
      </div>
    </header>
  );
}
