"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/" || pathname.startsWith("/auth")) return null;

  return (
    <footer className="mt-auto border-t border-stone-900/10 bg-np-peach/40 py-6 text-sm text-stone-700/90 dark:border-white/10 dark:bg-stone-950/80 dark:text-stone-200/85">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-semibold text-np-terracotta dark:text-np-cream">Nature+</span> 智能图鉴 · 科普教育用途，内容以站内资料与许可素材为准。
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/disclaimer" className="underline-offset-2 hover:text-np-terracotta hover:underline dark:hover:text-np-cream">
            免责声明
          </Link>
          <Link href="/privacy" className="underline-offset-2 hover:text-np-terracotta hover:underline dark:hover:text-np-cream">
            隐私说明
          </Link>
        </div>
      </div>
    </footer>
  );
}
