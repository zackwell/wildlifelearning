"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MarkdownBody } from "@/components/MarkdownBody";
import { literatureRagLabels } from "@/lib/literature/rag-labels";
import {
  LiteratureTranslateButton,
  LiteratureTranslateStatus,
} from "@/components/topics/LiteratureTranslateButton";
import {
  getLiteratureDocCache,
  setLiteratureDocCache,
  useLiteratureDocCache,
  type LiteratureDocSnapshot,
} from "@/lib/client-session-cache";

type ViewMode = "original" | "zh";

export function LiteratureReadClient({ id }: { id: string }) {
  const cachedDoc = useLiteratureDocCache(id);
  const [loading, setLoading] = useState(() => getLiteratureDocCache(id) === null);
  const [error, setError] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [doc, setDoc] = useState<LiteratureDocSnapshot | null>(() => getLiteratureDocCache(id));
  const [view, setView] = useState<ViewMode>("original");

  const loadDoc = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/literature/${id}`, { credentials: "same-origin" });
      const json = (await res.json()) as LiteratureDocSnapshot & {
        error?: string;
        predominantlyChinese?: boolean;
      };
      if (!res.ok) throw new Error(json.error ?? "加载失败");
      const next: LiteratureDocSnapshot = {
        title: json.title ?? "未命名",
        fileName: json.fileName ?? "",
        body: json.body ?? "",
        uploadedAt: json.uploadedAt ?? "",
        translation: json.translation ?? null,
        predominantlyChinese: json.predominantlyChinese ?? false,
      };
      setLiteratureDocCache(id, next);
      setDoc(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (cachedDoc) setDoc(cachedDoc);
  }, [cachedDoc]);

  useEffect(() => {
    const initial = getLiteratureDocCache(id);
    if (initial) {
      setDoc(initial);
      setLoading(false);
      return;
    }
    void loadDoc();
  }, [id, loadDoc]);

  const processing = doc?.translation?.status === "processing";
  useEffect(() => {
    if (!processing) return;
    const timer = window.setInterval(() => void loadDoc(), 4000);
    return () => window.clearInterval(timer);
  }, [processing, loadDoc]);

  if (loading && !doc) {
    return <p className="text-sm text-emerald-800/80 dark:text-emerald-200/75">加载中…</p>;
  }

  if (error || !doc) {
    return (
      <div className="space-y-3">
        <p className="text-red-700 dark:text-red-300">{error ?? "未找到资料"}</p>
        <Link href="/topics" className="text-sm font-medium text-emerald-800 underline dark:text-emerald-300">
          返回知识专题
        </Link>
      </div>
    );
  }

  const isMarkdown = /\.(md|markdown)$/i.test(doc.fileName);
  const predominantlyChinese = doc.predominantlyChinese ?? false;
  const zhReady = doc.translation?.status === "ready" && (doc.translation.zhBody?.length ?? 0) > 0;
  const labels = literatureRagLabels({ predominantlyChinese, zhRagReady: zhReady });
  const displayBody = view === "zh" && zhReady ? doc.translation!.zhBody : doc.body;
  const displayMarkdown = view === "zh" ? true : isMarkdown;

  return (
    <article>
      <header className="border-b border-emerald-900/10 pb-6 dark:border-emerald-100/10">
        <p className="text-sm text-emerald-800/80 dark:text-emerald-200/75">
          <Link href="/topics" className="hover:underline">
            知识专题
          </Link>
          <span className="mx-2">/</span>
          <span>{doc.title}</span>
        </p>
        <h1 className="mt-2 text-3xl font-bold text-emerald-950 dark:text-emerald-50">{doc.title}</h1>
        <p className="mt-2 text-xs text-emerald-800/70 dark:text-emerald-200/65">
          {doc.fileName}
          {doc.uploadedAt ? ` · ${new Date(doc.uploadedAt).toLocaleString("zh-CN")}` : ""}
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <LiteratureTranslateButton
              literatureId={id}
              zhRagReady={zhReady}
              translationFailed={doc.translation?.status === "failed"}
              translationProcessing={doc.translation?.status === "processing"}
              predominantlyChinese={predominantlyChinese}
              onDone={() => void loadDoc()}
              onError={setJobError}
            />
            {zhReady ? (
              <div className="inline-flex shrink-0 rounded-lg border border-emerald-800/30 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setView("original")}
                  className={
                    view === "original"
                      ? "rounded-md bg-emerald-800 px-3 py-1.5 font-semibold text-white"
                      : "rounded-md px-3 py-1.5 text-emerald-900 dark:text-emerald-100"
                  }
                >
                  {labels.viewOriginal}
                </button>
                <button
                  type="button"
                  onClick={() => setView("zh")}
                  className={
                    view === "zh"
                      ? "rounded-md bg-emerald-800 px-3 py-1.5 font-semibold text-white"
                      : "rounded-md px-3 py-1.5 text-emerald-900 dark:text-emerald-100"
                  }
                >
                  {labels.viewOptimized}
                </button>
              </div>
            ) : null}
          </div>
          <LiteratureTranslateStatus
            zhRagReady={zhReady}
            translationFailed={doc.translation?.status === "failed"}
            translationProcessing={doc.translation?.status === "processing"}
            predominantlyChinese={predominantlyChinese}
            error={jobError}
          />
        </div>
        {view === "zh" && zhReady ? (
          <p className="mt-3 text-xs text-emerald-800/80 dark:text-emerald-200/70">
            {predominantlyChinese
              ? "以下为智能排版后的检索优化版；学术引用请以原文为准。"
              : "以下为 AI 翻译排版后的检索版；学术引用请以原文为准。"}
          </p>
        ) : null}
      </header>
      <div className="mt-8">
        {displayMarkdown ? (
          <MarkdownBody content={displayBody} />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-emerald-950 dark:text-emerald-50">
            {displayBody}
          </pre>
        )}
      </div>
    </article>
  );
}
