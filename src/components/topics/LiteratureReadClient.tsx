"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarkdownBody } from "@/components/MarkdownBody";
import {
  getLiteratureDocCache,
  setLiteratureDocCache,
  useLiteratureDocCache,
  type LiteratureDocSnapshot,
} from "@/lib/client-session-cache";

export function LiteratureReadClient({ id }: { id: string }) {
  const cachedDoc = useLiteratureDocCache(id);
  const [loading, setLoading] = useState(() => getLiteratureDocCache(id) === null);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<LiteratureDocSnapshot | null>(() => getLiteratureDocCache(id));

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

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/literature/${id}`, { credentials: "same-origin" });
        const json = (await res.json()) as {
          title?: string;
          fileName?: string;
          body?: string;
          uploadedAt?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "加载失败");
        const next = {
          title: json.title ?? "未命名",
          fileName: json.fileName ?? "",
          body: json.body ?? "",
          uploadedAt: json.uploadedAt ?? "",
        };
        if (!cancelled) {
          setLiteratureDocCache(id, next);
          setDoc(next);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
      </header>
      <div className="mt-8">
        {isMarkdown ? (
          <MarkdownBody content={doc.body} />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-emerald-950 dark:text-emerald-50">
            {doc.body}
          </pre>
        )}
      </div>
    </article>
  );
}
