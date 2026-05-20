"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { canUseNextImageForUrl, isUserUploadedImage } from "@/lib/species-image-slides";

const CAROUSEL_MS = 4500;
/** 右侧缩略图列一次可见张数 */
const SIDEBAR_VISIBLE = 4;
const THUMB_H_PX = 56;
const THUMB_GAP_PX = 8;
const SIDEBAR_MAX_H = SIDEBAR_VISIBLE * THUMB_H_PX + (SIDEBAR_VISIBLE - 1) * THUMB_GAP_PX;

type Props = {
  slides: string[];
  alt: string;
  coverUrl: string | null;
  onSetCover: (url: string) => void;
  onRemove: (url: string) => void;
};

export function FieldGuideImageGallery({ slides, alt, coverUrl, onSetCover, onRemove }: Props) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const thumbListRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const container = thumbListRef.current;
    const thumb = thumbRefs.current[idx];
    if (!container || !thumb) return;

    const thumbTop = thumb.offsetTop;
    const thumbBottom = thumbTop + thumb.offsetHeight;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;

    if (thumbTop < viewTop) {
      container.scrollTop = thumbTop;
    } else if (thumbBottom > viewBottom) {
      container.scrollTop = thumbBottom - container.clientHeight;
    }
  }, [idx]);

  const current = slides[idx] ?? slides[0];
  if (!current) return null;

  const isCover = Boolean(coverUrl && current === coverUrl);
  const useNextImage = canUseNextImageForUrl(current);

  return (
    <div
      className="flex max-w-3xl gap-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 主图 */}
      <div className="relative min-w-0 flex-1">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-emerald-900/10 bg-emerald-100/60 dark:border-emerald-100/10 dark:bg-emerald-900/30">
          {useNextImage ? (
            <Image
              src={current}
              alt={alt}
              fill
              className="object-contain object-center transition-opacity duration-300"
              sizes="(max-width: 768px) 70vw, 560px"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current}
              alt={alt}
              className="absolute inset-0 h-full w-full object-contain object-center transition-opacity duration-300"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/40 to-transparent" />

          {/* 右上角：设为封面 */}
          <div className="pointer-events-auto absolute right-2 top-2 z-10">
            {isCover ? (
              <span className="rounded-lg bg-emerald-900/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow">
                当前封面
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onSetCover(current)}
                className="rounded-lg bg-emerald-800/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow hover:bg-emerald-700"
              >
                设为封面
              </button>
            )}
          </div>

          {/* 左下角：删除 + 计数 */}
          <div className="pointer-events-auto absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
            <button
              type="button"
              onClick={() => onRemove(current)}
              className="rounded-lg bg-red-700/90 px-2 py-1 text-[11px] font-semibold text-white shadow hover:bg-red-600"
            >
              删除此图
            </button>
            {slides.length > 1 ? (
              <span className="rounded-md bg-black/45 px-2 py-0.5 text-[11px] font-medium tabular-nums text-white/95">
                {idx + 1} / {slides.length}
                {paused ? " · 已暂停" : ""}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* 右侧缩略图列（最多可见 4 张，其余滚动） */}
      {slides.length > 1 ? (
        <div
          ref={thumbListRef}
          className="w-[4.5rem] shrink-0 overflow-y-auto overscroll-contain pr-0.5"
          style={{ maxHeight: SIDEBAR_MAX_H }}
          aria-label="切换配图"
        >
          <div className="flex flex-col gap-2">
            {slides.map((url, i) => {
              const active = i === idx;
              const isThumbCover = coverUrl === url;
              const isUser = isUserUploadedImage(url);
              return (
                <button
                  key={url.slice(0, 64) + i}
                  ref={(el) => {
                    thumbRefs.current[i] = el;
                  }}
                  type="button"
                  aria-label={`第 ${i + 1} 张${isThumbCover ? "（封面）" : ""}`}
                  aria-current={active ? "true" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    setIdx(i);
                  }}
                  className={`relative h-14 w-full shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                    active
                      ? "border-emerald-600 ring-2 ring-emerald-600/40 dark:border-emerald-400"
                      : "border-emerald-900/15 opacity-85 hover:opacity-100 dark:border-emerald-100/15"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy={canUseNextImageForUrl(url) ? undefined : "no-referrer"}
                  />
                  {isThumbCover ? (
                    <span className="absolute bottom-0 left-0 right-0 bg-emerald-900/85 py-px text-center text-[9px] font-medium text-white">
                      封面
                    </span>
                  ) : null}
                  {isUser && !isThumbCover ? (
                    <span className="absolute left-0.5 top-0.5 rounded bg-black/55 px-1 text-[8px] text-white">
                      本机
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
