"use client";

import { useRef, useState } from "react";
import { FieldGuideImageGallery } from "@/components/field-guide/FieldGuideImageGallery";
import { fileToCompressedDataUrl } from "@/lib/field-guide-images";
import {
  addFieldGuideUserImage,
  removeFieldGuideImage,
  setFieldGuideCoverImage,
} from "@/lib/personal-field-guide";
import type { ExploreSpeciesPayload } from "@/lib/explore-species";
import { fieldGuideAllSlides } from "@/lib/species-image-slides";

type Props = {
  entryId: string;
  species: ExploreSpeciesPayload;
  alt: string;
  onUpdated: () => void;
};

export function FieldGuideImageManager({ entryId, species, alt, onUpdated }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slides = fieldGuideAllSlides(species);
  const cover = species.coverImageUrl?.trim() ?? slides[0] ?? null;

  async function onFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const dataUrl = await fileToCompressedDataUrl(file);
        await addFieldGuideUserImage(entryId, dataUrl);
      }
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onRemove(url: string) {
    if (!confirm("确定移除这张配图？")) return;
    void removeFieldGuideImage(entryId, url).then(onUpdated);
  }

  function onSetCover(url: string) {
    void setFieldGuideCoverImage(entryId, url).then(onUpdated);
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">物种配图</h2>

      {slides.length > 0 ? (
        <FieldGuideImageGallery
          key={slides.join("|")}
          slides={slides}
          alt={alt}
          coverUrl={cover}
          onSetCover={onSetCover}
          onRemove={onRemove}
        />
      ) : (
        <div className="max-w-3xl rounded-xl border border-dashed border-emerald-800/25 bg-emerald-50/50 px-4 py-8 text-center text-sm text-emerald-900/80 dark:border-emerald-200/20 dark:bg-emerald-950/35 dark:text-emerald-100/80">
          暂无配图。可上传本机照片作为物种配图与列表封面。
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="sr-only"
        onChange={(e) => void onFilesSelected(e.target.files)}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="rounded-xl border border-emerald-800/30 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-200/25 dark:bg-emerald-950/50 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
      >
        {uploading ? "处理中…" : "上传本机图片"}
      </button>

      {error ? <p className="text-sm text-red-700 dark:text-red-300">{error}</p> : null}

      <p className="max-w-3xl text-xs leading-relaxed text-emerald-800/75 dark:text-emerald-200/70">
        主图会自动轮播；点击右侧小图可切换当前主图，再点主图右上角「设为封面」即可设为列表缩略图。右侧一次显示 4 张，更多配图可向下滚动。图片仅保存在本浏览器。
      </p>
    </section>
  );
}
