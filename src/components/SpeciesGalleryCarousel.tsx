"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { canUseNextImageForUrl } from "@/lib/species-image-slides";

const CAROUSEL_MS = 4500;

const frameTone = {
  sky: "border-sky-900/10 bg-sky-100/60 dark:border-sky-100/10 dark:bg-sky-900/30",
  emerald:
    "border-emerald-900/10 bg-emerald-100/60 dark:border-emerald-100/10 dark:bg-emerald-900/30",
} as const;

type Tone = keyof typeof frameTone;

export function SpeciesGalleryCarousel({
  slides,
  alt,
  tone = "sky",
  allowRemove = false,
  onRemoveSlide,
  coverImageUrl = null,
  onSetCover,
}: {
  slides: string[];
  alt: string;
  tone?: Tone;
  /** 显示「移除此图」：从当前展示列表中去掉该 URL（由父组件更新 slides） */
  allowRemove?: boolean;
  onRemoveSlide?: (url: string) => void;
  coverImageUrl?: string | null;
  onSetCover?: (url: string) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setIdx(0);
  }, [slides]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, CAROUSEL_MS);
    return () => clearInterval(id);
  }, [slides, paused]);

  const current = slides[idx] ?? slides[0];
  if (!current) return null;

  const useNextImage = canUseNextImageForUrl(current);
  const canRemove = allowRemove && typeof onRemoveSlide === "function" && slides.length > 0;
  const canSetCover = typeof onSetCover === "function" && slides.length > 0;
  const isCover = Boolean(coverImageUrl && current === coverImageUrl);

  return (
    <div
      className={`relative mb-4 aspect-[16/10] w-full max-w-2xl overflow-hidden rounded-2xl border ${frameTone[tone]}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {useNextImage ? (
        <Image
          src={current}
          alt={alt}
          fill
          className="object-contain object-center transition-opacity duration-500"
          sizes="(max-width: 768px) 100vw, 672px"
          priority={false}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- 其它域名不固定，避免维护大量 remotePatterns
        <img
          src={current}
          alt={alt}
          className="absolute inset-0 h-full w-full object-contain object-center transition-opacity duration-500"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      )}

      {canRemove || canSetCover ? (
        <div className="pointer-events-auto absolute left-2 top-2 z-10 flex flex-wrap gap-1.5">
          {canSetCover && !isCover ? (
            <button
              type="button"
              onClick={() => onSetCover?.(current)}
              className="rounded-lg bg-emerald-800/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow hover:bg-emerald-700"
            >
              设为封面
            </button>
          ) : null}
          {isCover ? (
            <span className="rounded-lg bg-emerald-900/80 px-2.5 py-1 text-[11px] font-semibold text-white">
              封面
            </span>
          ) : null}
          {canRemove ? (
            <button
              type="button"
              onClick={() => onRemoveSlide?.(current)}
              className="rounded-lg bg-red-700/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow hover:bg-red-600 dark:bg-red-800/95 dark:hover:bg-red-700"
            >
              移除此图
            </button>
          ) : null}
        </div>
      ) : null}

      {slides.length > 1 ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5 px-2 pointer-events-auto">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`第 ${i + 1} 张`}
                aria-current={i === idx ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  setIdx(i);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75"
                }`}
              />
            ))}
          </div>
          <p
            className={`pointer-events-none absolute text-[11px] font-medium text-white/95 tabular-nums ${
              canRemove ? "right-2 top-10" : "right-2 top-2"
            } rounded-md bg-black/40 px-2 py-0.5`}
          >
            {idx + 1} / {slides.length}
            {paused ? " · 已暂停" : ""}
          </p>
        </>
      ) : canRemove ? (
        <p className="pointer-events-none absolute right-2 top-10 rounded-md bg-black/40 px-2 py-0.5 text-[11px] font-medium text-white/95 tabular-nums">
          1 / 1
          {paused ? " · 已暂停" : ""}
        </p>
      ) : null}
    </div>
  );
}
