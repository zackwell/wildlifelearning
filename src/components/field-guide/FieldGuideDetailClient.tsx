"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MarkdownBody } from "@/components/MarkdownBody";
import { FieldGuideImageManager } from "@/components/field-guide/FieldGuideImageManager";
import type { FieldGuideSavedEntry } from "@/lib/personal-field-guide";
import { getFieldGuideEntry, removeFieldGuideEntry } from "@/lib/personal-field-guide";
import { reportSearchLinks } from "@/lib/report-search-links";
import { normalizeSpeciesTaxon } from "@/lib/species-taxon-normalize";
import { useEffect, useMemo, useState } from "react";

export function FieldGuideDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [entry, setEntry] = useState<FieldGuideSavedEntry | null | undefined>(undefined);

  useEffect(() => {
    void getFieldGuideEntry(id).then((e) => setEntry(e ?? null));
  }, [id]);

  const refreshEntry = () => {
    void getFieldGuideEntry(id).then((e) => setEntry(e ?? null));
  };

  const reports = useMemo(() => {
    if (!entry?.species) return [];
    return reportSearchLinks(entry.species.reportSearchQuery);
  }, [entry]);

  if (entry === undefined) {
    return (
      <p className="text-sm text-emerald-800/80 dark:text-emerald-200/75">加载中…</p>
    );
  }

  if (!entry) {
    return (
      <div className="space-y-4">
        <p className="text-emerald-900 dark:text-emerald-100">未找到该图鉴条目，可能已被删除或来自其他浏览器。</p>
        <Link href="/my-field-guide" className="text-sm font-medium text-emerald-800 underline dark:text-emerald-300">
          返回我的图鉴
        </Link>
      </div>
    );
  }

  const s = entry.species;

  function onRemove() {
    if (!confirm(`确定从「我的图鉴」中移除「${s.name}」？`)) return;
    void removeFieldGuideEntry(id).then(() => {
      router.push("/my-field-guide");
      router.refresh();
    });
  }

  return (
    <article className="space-y-8">
      <nav className="text-sm text-emerald-800/80 dark:text-emerald-200/75">
        <Link href="/my-field-guide" className="hover:underline">
          我的图鉴
        </Link>
        <span className="mx-2">/</span>
        <span>{s.name}</span>
      </nav>

      <header className="border-b border-emerald-900/10 pb-6 dark:border-emerald-100/10">
        <h1 className="text-3xl font-bold text-emerald-950 dark:text-emerald-50">{s.name}</h1>
        <p className="mt-1 text-lg italic text-emerald-900/85 dark:text-emerald-100/80">{s.scientificName}</p>
        <p className="mt-3 text-base text-emerald-900/90 dark:text-emerald-100/85">{s.summary}</p>
        <p className="mt-2 text-xs text-emerald-800/70 dark:text-emerald-200/65">
          收藏于 {new Date(entry.savedAt).toLocaleString("zh-CN")} · 内容为 AI 草稿，请以文献与权威资料为准
          {s.imageProvider ? (
            <span className="ml-2">· 配图来源：Unsplash</span>
          ) : null}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/my-field-guide/${id}/learn`}
            className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-600"
          >
            学习检测
          </Link>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-xl border border-red-800/30 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50 dark:border-red-300/30 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            从图鉴移除
          </button>
        </div>
      </header>

      <FieldGuideImageManager
        entryId={id}
        species={s}
        alt={s.name}
        onUpdated={refreshEntry}
      />

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-emerald-900 dark:text-emerald-200">分类</dt>
          <dd className="text-emerald-900/85 dark:text-emerald-100/80">{normalizeSpeciesTaxon(s.taxon)}</dd>
        </div>
        <div>
          <dt className="font-medium text-emerald-900 dark:text-emerald-200">栖息地</dt>
          <dd className="text-emerald-900/85 dark:text-emerald-100/80">{s.habitat}</dd>
        </div>
        <div>
          <dt className="font-medium text-emerald-900 dark:text-emerald-200">食性</dt>
          <dd className="text-emerald-900/85 dark:text-emerald-100/80">{s.diet}</dd>
        </div>
        <div>
          <dt className="font-medium text-emerald-900 dark:text-emerald-200">保护状况</dt>
          <dd className="text-emerald-900/85 dark:text-emerald-100/80">{s.conservation}</dd>
        </div>
      </dl>

      <section>
        <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">身体结构与器官</h2>
        <div className="mt-2 rounded-xl border border-emerald-900/10 bg-white/80 p-4 dark:border-emerald-100/10 dark:bg-emerald-950/30">
          <MarkdownBody variant="compact" content={s.bodyStructureMarkdown} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">习性与行为</h2>
        <div className="mt-2 rounded-xl border border-emerald-900/10 bg-white/80 p-4 dark:border-emerald-100/10 dark:bg-emerald-950/30">
          <MarkdownBody variant="compact" content={s.habitsMarkdown} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">趣闻与冷知识</h2>
        <div className="mt-2 rounded-xl border border-emerald-900/10 bg-white/80 p-4 dark:border-emerald-100/10 dark:bg-emerald-950/30">
          <MarkdownBody variant="compact" content={s.funFactsMarkdown} />
        </div>
      </section>

      {(s.supplementSections ?? []).map((sec) => (
        <section key={sec.title}>
          <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">{sec.title}</h2>
          <div className="mt-2 rounded-xl border border-emerald-900/10 bg-white/80 p-4 dark:border-emerald-100/10 dark:bg-emerald-950/30">
            <MarkdownBody variant="compact" content={sec.bodyMarkdown} />
          </div>
        </section>
      ))}

      <section>
        <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">延伸阅读</h2>
        <p className="mt-1 text-sm text-emerald-900/85 dark:text-emerald-100/80">
          以下链接在浏览器中打开第三方学术检索，全文与版权以各平台为准。
        </p>
        <p className="mt-1 text-xs text-emerald-800/75 dark:text-emerald-200/70">
          建议检索词：<span className="font-mono">{s.reportSearchQuery}</span>
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {reports.map((r) => (
            <li key={r.label}>
              <a
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-lg border border-emerald-800/25 px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-100/60 dark:border-emerald-200/20 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
              >
                {r.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">概览正文</h2>
        <div className="mt-2 rounded-xl border border-emerald-900/10 bg-white/80 p-4 dark:border-emerald-100/10 dark:bg-emerald-950/30">
          <MarkdownBody variant="compact" content={s.bodyMarkdown} />
        </div>
      </section>
    </article>
  );
}
