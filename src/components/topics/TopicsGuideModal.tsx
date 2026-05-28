"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { setSkipTopicsGuideAuto } from "@/lib/topics/guide";

type Props = {
  open: boolean;
  onClose: () => void;
};

const stepClass =
  "rounded-xl border border-emerald-900/10 bg-emerald-50/50 px-4 py-3 dark:border-emerald-100/10 dark:bg-emerald-950/40";
const listClass = "mt-2 space-y-1.5 text-sm leading-relaxed text-emerald-900/85 dark:text-emerald-100/85";
const sectionTitleClass = "text-sm font-semibold text-emerald-950 dark:text-emerald-50";

export function TopicsGuideModal({ open, onClose }: Props) {
  const skipRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function dismiss() {
    setSkipTopicsGuideAuto(skipRef.current?.checked ?? false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="topics-guide-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-950/50 backdrop-blur-[1px]"
        aria-label="关闭"
        onClick={dismiss}
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl border border-emerald-900/15 bg-white shadow-xl sm:rounded-2xl dark:border-emerald-100/10 dark:bg-stone-900">
        <div className="shrink-0 border-b border-emerald-900/10 px-5 py-4 dark:border-emerald-100/10 sm:px-6">
          <h2 id="topics-guide-title" className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">
            知识专题 · 使用引导
          </h2>
          <p className="mt-1 text-sm text-emerald-900/75 dark:text-emerald-100/75">
            上传并管理你的文献，供智能助手检索；与图鉴、问答形成学习闭环。
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          <section>
            <h3 className={sectionTitleClass}>推荐使用流程</h3>
            <ol className="mt-3 space-y-2">
              {[
                {
                  title: "上传文献",
                  body: "在本页选择 PDF、Word、Markdown 或纯文本。上传后系统会解析正文并建立检索索引。",
                },
                {
                  title: "阅读与优化",
                  body: "点「阅读」在线浏览。外文文献建议「生成检索版」；中文但排版杂乱的可「智能排版」，便于中文提问时被助手引用。",
                },
                {
                  title: "启用助手引用",
                  body: "勾选「在智能助手中引用此文」。未勾选的文献不会参与问答检索。",
                },
                {
                  title: "到智能助手提问",
                  body: "打开智能助手，可选关联「我的图鉴」中的物种，基于已启用文献提问；回答会标注引用来源。",
                },
                {
                  title: "补充至图鉴（可选）",
                  body: "若已关联图鉴条目，可将满意回答整理后「补充至图鉴」，把文献中的细节并入对应栏目。",
                },
              ].map((step, i) => (
                <li key={step.title} className={stepClass}>
                  <p className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-800 text-xs font-bold text-white dark:bg-emerald-600">
                      {i + 1}
                    </span>
                    {step.title}
                  </p>
                  <p className="mt-1.5 pl-8 text-sm leading-relaxed text-emerald-900/85 dark:text-emerald-100/85">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className={sectionTitleClass}>适合上传哪些文献？</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className={`${stepClass} border-emerald-700/20`}>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">✓ 推荐</p>
                <ul className={listClass}>
                  <li>与你在学物种相关的科普文章、教材章节、论文摘要或讨论部分</li>
                  <li>野外识别手册、保护现状报告、行为生态类资料</li>
                  <li>文字层完整的 PDF / Word，段落清晰、便于分段检索</li>
                  <li>外文资料上传后生成中文检索版，再用中文提问</li>
                </ul>
              </div>
              <div className={`${stepClass} border-amber-700/25 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-950/30`}>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">⚠ 谨慎 / 不宜</p>
                <ul className={`${listClass} text-amber-950/90 dark:text-amber-100/90`}>
                  <li>扫描版 PDF 无文字层、图片为主无法提取正文</li>
                  <li>整本大部头教材（建议节选相关章节再上传）</li>
                  <li>与当前学习主题无关、或侵犯版权的资料</li>
                  <li>损坏、加密或无法打开的文件</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h3 className={sectionTitleClass}>与其他模块如何联动？</h3>
            <ul className={`${listClass} mt-3 rounded-xl border border-emerald-900/10 bg-white/60 p-4 dark:border-emerald-100/10 dark:bg-emerald-950/25`}>
              <li>
                <strong className="text-emerald-950 dark:text-emerald-50">探索动物 → 我的图鉴：</strong>
                图鉴提供 AI 生成的物种概览，是学习的起点。
              </li>
              <li>
                <strong className="text-emerald-950 dark:text-emerald-50">知识专题 → 智能助手：</strong>
                文献提供深度依据；助手在启用文献范围内检索作答，比纯通识回答更贴近你的资料。
              </li>
              <li>
                <strong className="text-emerald-950 dark:text-emerald-50">智能助手 → 我的图鉴：</strong>
                关联图鉴提问后，可将回答补充进图鉴，把文献细节沉淀为个人笔记。
              </li>
              <li>
                <strong className="text-emerald-950 dark:text-emerald-50">学习检测 / 题库：</strong>
                仍以图鉴正文出题；文献主要用于助手深挖，二者配合效果更好。
              </li>
            </ul>
            <p className="mt-3 text-sm text-emerald-900/80 dark:text-emerald-100/80">
              实践建议：为正在学习的 1～2 个物种各上传 1～2 篇专题文献，启用引用后在{" "}
              <Link href="/ask" className="font-medium underline-offset-2 hover:underline" onClick={dismiss}>
                智能助手
              </Link>{" "}
              中关联对应图鉴提问。
            </p>
          </section>
        </div>

        <div className="shrink-0 border-t border-emerald-900/10 px-5 py-4 dark:border-emerald-100/10 sm:px-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
            <input ref={skipRef} type="checkbox" className="rounded border-stone-300" />
            以后进入本页不再自动弹出
          </label>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/guide#topics"
              className="text-sm font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-200"
              onClick={dismiss}
            >
              查看完整使用说明
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg bg-emerald-800 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-600"
            >
              知道了，开始上传
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
