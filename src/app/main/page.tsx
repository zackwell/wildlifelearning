import Link from "next/link";
import { ExploreAnimals } from "@/components/explore/ExploreAnimals";

export default function MainHubPage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-stone-900/10 bg-gradient-to-br from-np-peach/50 to-white p-8 shadow-sm dark:border-white/10 dark:from-stone-900/80 dark:to-stone-950/60">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
          探索你感兴趣的动物，建立个人图鉴
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-stone-700/90 dark:text-stone-200/85">
          图鉴包含物种分布、习性、身体结构等内容，生成后可供学习使用，自动生成题库。智能助手可查缺补漏将您想了解的内容补充到图鉴中。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/my-field-guide"
            className="rounded-xl bg-np-cta px-4 py-2 text-sm font-semibold text-np-cta-ink shadow-sm transition hover:bg-np-cta-hover"
          >
            打开我的图鉴
          </Link>
          {/* <Link
            href="/topics"
            className="rounded-xl border border-stone-800/20 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-white/80 dark:border-stone-100/20 dark:text-stone-100 dark:hover:bg-stone-800/50"
          >
            知识专题
          </Link> */}
          <Link
            href="/ask"
            className="rounded-xl border border-stone-800/20 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-white/80 dark:border-stone-100/20 dark:text-stone-100 dark:hover:bg-stone-800/50"
          >
            智能助手
          </Link>
          <Link
            href="/"
            className="rounded-xl px-4 py-2 text-sm font-medium text-stone-600 underline-offset-2 hover:underline dark:text-stone-300"
          >
            返回欢迎页
          </Link>
        </div>
      </section>

      <ExploreAnimals />
    </div>
  );
}