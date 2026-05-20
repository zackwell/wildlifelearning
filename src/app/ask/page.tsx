import { Suspense } from "react";
import { AskPanel } from "./AskPanel";

export default function AskPage() {
  return (
    <div className="mx-auto w-full max-w-xl py-10 pt-[max(2rem,7vh)] sm:py-14 sm:pt-[max(2.5rem,9vh)]">
      <h1 className="text-center font-sans text-4xl font-bold tracking-tight text-np-terracotta dark:text-np-cream sm:text-5xl">
        智能助手
      </h1>
      <Suspense fallback={<p className="mt-8 text-center text-base text-stone-700/80 dark:text-stone-200/75">加载中…</p>}>
        <AskPanel />
      </Suspense>
    </div>
  );
}
