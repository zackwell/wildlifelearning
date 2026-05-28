"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FieldGuideSavedEntry } from "@/lib/personal-field-guide";
import {
  loadFieldGuideEntries,
  removeFieldGuideEntry,
  toggleFieldGuideStarred,
} from "@/lib/personal-field-guide";
import {
  FIELD_GUIDE_SORT_OPTIONS,
  filterFieldGuideEntriesByQuery,
  saveFieldGuideSortMode,
  sortFieldGuideEntries,
  type FieldGuideSortMode,
} from "@/lib/field-guide-list-sort";
import {
  getFieldGuideListCache,
  removeFieldGuideListCacheItem,
  setFieldGuideListCache,
  updateFieldGuideListCacheItem,
  useFieldGuideListCache,
} from "@/lib/client-session-cache";
import { fieldGuideCoverImage } from "@/lib/species-image-slides";
import { loadUserPreferences } from "@/lib/user-preferences";

export function MyFieldGuideClient() {
  const listCache = useFieldGuideListCache();
  const [mounted, setMounted] = useState(() => getFieldGuideListCache() !== null);
  const [entries, setEntries] = useState<FieldGuideSavedEntry[]>(() => getFieldGuideListCache() ?? []);
  const [sortMode, setSortMode] = useState<FieldGuideSortMode>("savedAt");
  const [starredOnly, setStarredOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void loadFieldGuideEntries().then((list) => {
      setEntries(list);
      setFieldGuideListCache(list);
    });
  }, []);

  useEffect(() => {
    if (listCache) setEntries(listCache);
  }, [listCache]);

  useEffect(() => {
    setMounted(true);
    const prefs = loadUserPreferences();
    setSortMode(prefs.fieldGuideSortMode);
    setStarredOnly(prefs.fieldGuideStarredOnlyDefault);
    refresh();
  }, [refresh]);

  const starredCount = useMemo(() => entries.filter((e) => e.starred).length, [entries]);

  const visible = useMemo(() => {
    const base = starredOnly ? entries.filter((e) => e.starred) : entries;
    const filtered = filterFieldGuideEntriesByQuery(base, searchQuery);
    return sortFieldGuideEntries(filtered, sortMode);
  }, [entries, sortMode, starredOnly, searchQuery]);

  const trimmedSearch = searchQuery.trim();

  function onSortChange(mode: FieldGuideSortMode) {
    setSortMode(mode);
    saveFieldGuideSortMode(mode);
  }

  async function onToggleStar(e: React.MouseEvent, id: string, starred: boolean) {
    e.preventDefault();
    e.stopPropagation();
    setBusyId(id);
    try {
      const updated = await toggleFieldGuideStarred(id, !starred);
      if (updated) updateFieldGuideListCacheItem(updated);
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(e: React.MouseEvent, entry: FieldGuideSavedEntry) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`确定从「我的图鉴」中移除「${entry.species.name}」？`)) return;
    setBusyId(entry.id);
    try {
      await removeFieldGuideEntry(entry.id);
      setEntries((prev) => prev.filter((x) => x.id !== entry.id));
      removeFieldGuideListCacheItem(entry.id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-emerald-950 dark:text-emerald-50">我的图鉴</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-900/85 dark:text-emerald-100/85">
          登录后图鉴保存在云端，换设备也能访问。点击卡片右上角星标可收藏常用条目。
        </p>
        <p className="mt-2 text-sm text-emerald-800/80 dark:text-emerald-200/75">
          <Link href="/main" className="font-medium underline-offset-2 hover:underline">
            去图鉴主页探索动物
          </Link>
        </p>
      </header>

      {mounted && entries.length > 0 ? (
        <div className="space-y-3">
          <label className="block">
            <span className="sr-only">搜索图鉴</span>
            <div className="relative max-w-xl">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索中文名、学名、分类…"
                className="w-full rounded-xl border border-emerald-800/20 bg-white/90 py-2.5 pl-4 pr-10 text-sm text-emerald-950 shadow-sm outline-none ring-emerald-600/25 placeholder:text-emerald-800/50 focus:border-emerald-600 focus:ring-2 dark:border-emerald-100/15 dark:bg-emerald-950/50 dark:text-emerald-50 dark:placeholder:text-emerald-200/45"
              />
              {trimmedSearch ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-emerald-800/70 hover:bg-emerald-100/80 dark:text-emerald-200/70 dark:hover:bg-emerald-900/50"
                  aria-label="清空搜索"
                >
                  清空
                </button>
              ) : null}
            </div>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setStarredOnly((v) => !v)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium shadow-sm transition ${
                starredOnly
                  ? "border-amber-400/60 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-300/40 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-950/70"
                  : "border-emerald-800/20 bg-white/90 text-emerald-900 hover:border-emerald-700/35 dark:border-emerald-100/15 dark:bg-emerald-950/50 dark:text-emerald-100"
              }`}
            >
              {starredOnly ? "显示全部" : "只看收藏"}
            </button>
            <label className="flex items-center gap-2 text-sm text-emerald-900 dark:text-emerald-100">
              <span className="font-medium">排序</span>
              <select
                value={sortMode}
                onChange={(e) => onSortChange(e.target.value as FieldGuideSortMode)}
                className="rounded-lg border border-emerald-800/20 bg-white/90 px-3 py-1.5 text-sm text-emerald-950 shadow-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/25 dark:border-emerald-100/15 dark:bg-emerald-950/50 dark:text-emerald-50"
              >
                {FIELD_GUIDE_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-xs text-emerald-800/70 dark:text-emerald-200/65">
              {trimmedSearch
                ? `匹配 ${visible.length} / ${starredOnly ? entries.filter((e) => e.starred).length : entries.length} 条`
                : starredOnly
                  ? `收藏 ${visible.length} 条`
                  : `共 ${entries.length} 条${starredCount > 0 ? ` · ${starredCount} 条收藏` : ""}`}
            </span>
          </div>
        </div>
      ) : null}

      {!mounted && entries.length === 0 ? (
        <p className="text-sm text-emerald-800/80 dark:text-emerald-200/75">加载中…</p>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-emerald-800/25 bg-emerald-50/50 px-6 py-12 text-center text-sm text-emerald-900/80 dark:border-emerald-200/20 dark:bg-emerald-950/30 dark:text-emerald-100/80">
          暂无图鉴。先在首页搜索动物并生成预览，再点击「加入我的图鉴」。
        </div>
      ) : visible.length === 0 && trimmedSearch ? (
        <div className="rounded-2xl border border-dashed border-emerald-800/25 bg-emerald-50/50 px-6 py-12 text-center text-sm text-emerald-900/80 dark:border-emerald-200/20 dark:bg-emerald-950/30 dark:text-emerald-100/80">
          未找到与「{trimmedSearch}」匹配的图鉴。可尝试学名、别称或分类关键词，或{" "}
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-200"
          >
            清空搜索
          </button>
          。
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-emerald-800/25 bg-emerald-50/50 px-6 py-12 text-center text-sm text-emerald-900/80 dark:border-emerald-200/20 dark:bg-emerald-950/30 dark:text-emerald-100/80">
          暂无收藏条目。点击资料卡右上角 ☆ 即可收藏。
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {visible.map((e) => {
            const thumb = fieldGuideCoverImage(e.species);
            const isStarred = Boolean(e.starred);
            const disabled = busyId === e.id;
            return (
              <li key={e.id}>
                <div className="group relative h-full rounded-2xl border border-emerald-900/10 bg-white/85 shadow-sm transition hover:border-emerald-700/35 hover:shadow-md dark:border-emerald-100/10 dark:bg-emerald-950/40">
                  <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label={isStarred ? "取消星标收藏" : "星标收藏"}
                      title={isStarred ? "取消星标" : "星标收藏"}
                      onClick={(ev) => void onToggleStar(ev, e.id, isStarred)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm shadow-sm transition disabled:opacity-50 ${
                        isStarred
                          ? "border-amber-400/60 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:border-amber-300/40 dark:bg-amber-950/60 dark:text-amber-300"
                          : "border-emerald-900/10 bg-white/95 text-emerald-800/50 opacity-90 hover:text-amber-600 group-hover:opacity-100 dark:border-emerald-100/15 dark:bg-emerald-900/80 dark:text-emerald-200/45 dark:hover:text-amber-300"
                      }`}
                    >
                      {isStarred ? "★" : "☆"}
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label="从图鉴中移除"
                      title="移除"
                      onClick={(ev) => void onDelete(ev, e)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-900/10 bg-white/95 text-emerald-800/70 shadow-sm transition hover:border-red-300/50 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:border-emerald-100/15 dark:bg-emerald-900/80 dark:text-emerald-200/70 dark:hover:border-red-900/40 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                    >
                      ×
                    </button>
                  </div>

                  <Link
                    href={`/my-field-guide/${e.id}`}
                    className="flex h-full gap-3 p-3 pr-20 sm:gap-4 sm:p-4"
                  >
                    {thumb ? (
                      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-emerald-900/10 bg-emerald-100/50 dark:border-emerald-100/10 dark:bg-emerald-900/30 sm:h-24 sm:w-32">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumb}
                          alt={e.species.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl border border-dashed border-emerald-800/20 bg-emerald-50/60 text-[10px] text-emerald-800/70 dark:border-emerald-200/15 dark:bg-emerald-950/40 dark:text-emerald-200/65 sm:h-24 sm:w-32">
                        无配图
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-lg font-semibold text-emerald-950 dark:text-emerald-50">
                        {e.species.name}
                        {isStarred ? (
                          <span className="text-xs font-normal text-amber-600 dark:text-amber-400">
                            已收藏
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm italic text-emerald-800/85 dark:text-emerald-200/80">
                        {e.species.scientificName}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-emerald-900/80 dark:text-emerald-100/80">
                        {e.species.summary}
                      </p>
                      <p className="mt-3 text-xs text-emerald-800/70 dark:text-emerald-200/65">
                        {new Date(e.savedAt).toLocaleString("zh-CN")}
                      </p>
                    </div>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
