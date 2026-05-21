"use client";

import Link from "next/link";
import { memo, useEffect, useMemo, useState } from "react";
import { MarkdownBody } from "@/components/MarkdownBody";
import { SpeciesGalleryCarousel } from "@/components/SpeciesGalleryCarousel";
import type { ExploreSpeciesPayload } from "@/lib/explore-species";
import { saveFieldGuideEntry } from "@/lib/personal-field-guide";
import { reportSearchLinks } from "@/lib/report-search-links";
import { speciesImageSlides } from "@/lib/species-image-slides";
import { SpeciesDisambiguationModal } from "@/components/explore/SpeciesDisambiguationModal";
import { SpeciesNameSuggestionModal } from "@/components/explore/SpeciesNameSuggestionModal";
import { FieldGuideGenerationProgress } from "@/components/explore/FieldGuideGenerationProgress";
import type { FieldGuideProgressPhase } from "@/lib/explore-generation-progress";
import type { SpeciesNameSuggestion } from "@/lib/species-query-suggestions";
import {
  isSpeciesDisambiguationPayload,
  normalizeExploreSpeciesQuery,
  resolveCuratedSpeciesDisambiguation,
  type SpeciesDisambiguation,
} from "@/lib/species-group-disambiguation-data";
import { normalizeSpeciesTaxon } from "@/lib/species-taxon-normalize";
import {
  getExploreDraft,
  patchExplorePreview,
  patchExploreQuery,
  prependFieldGuideListCache,
  useExplorePreview,
} from "@/lib/client-session-cache";

type ApiJson = {
  error?: string;
  status?: "choose_species" | "species" | "specific" | "suggest_name";
  species?: ExploreSpeciesPayload;
  disambiguation?: SpeciesDisambiguation;
  originalQuery?: string;
  suggestion?: SpeciesNameSuggestion;
};

function pickDisambiguation(json: ApiJson): SpeciesDisambiguation | null {
  if (json.status === "choose_species" && isSpeciesDisambiguationPayload(json.disambiguation)) {
    return json.disambiguation;
  }
  if (isSpeciesDisambiguationPayload(json.disambiguation)) {
    return json.disambiguation;
  }
  return null;
}

type ExploreRequestOptions = {
  skipDisambiguation?: boolean;
  genericOverview?: boolean;
  /** 消歧选具体种后：具体种无图时用此统称英译兜底搜图 */
  imageFallbackQuery?: string;
  /** 跳过名称纠正建议，仍用原输入生成 */
  forceQuery?: boolean;
  /** 当前输入框文字，用于决定是否在结果中回写 query */
  inputQuery?: string;
};

const ExploreSpeciesPreview = memo(function ExploreSpeciesPreview() {
  const { data, galleryEditedUrls, saveHint } = useExplorePreview();
  const baseSlides = useMemo(() => speciesImageSlides(data ?? {}), [data]);
  const displaySlides = galleryEditedUrls ?? baseSlides;

  if (!data) return null;

  return (
    <div className="mt-6 space-y-4 rounded-2xl border border-sky-900/10 bg-white/90 p-5 dark:border-sky-100/10 dark:bg-sky-950/35">
      <header className="border-b border-sky-900/10 pb-4 dark:border-sky-100/10">
        {displaySlides.length > 0 ? (
          <div>
            <SpeciesGalleryCarousel
              key={data.slug}
              slides={displaySlides}
              alt={data.name}
              tone="sky"
              allowRemove
              onRemoveSlide={(url) => {
                patchExplorePreview({
                  galleryEditedUrls: (galleryEditedUrls ?? baseSlides).filter((u) => u !== url),
                });
              }}
            />
            <p className="mt-1 max-w-2xl text-xs text-sky-800/80 dark:text-sky-200/70">
              配图为自动匹配的示意照片，可能有偏差，请点「移除此图」去掉后再加入图鉴。
            </p>
          </div>
        ) : (
          <div className="mb-4 max-w-2xl rounded-2xl border border-dashed border-sky-800/20 bg-sky-50/80 px-4 py-8 text-center text-sm leading-relaxed text-sky-800/80 dark:border-sky-200/15 dark:bg-sky-950/40 dark:text-sky-200/75">
            暂无匹配配图，不影响下方物种正文。可稍后在
            <Link href="/my-field-guide" className="mx-1 font-medium text-sky-900 underline dark:text-sky-100">
              我的图鉴
            </Link>
            中上传本机照片作为配图与封面。
          </div>
        )}
        <h3 className="text-2xl font-bold text-sky-950 dark:text-sky-50">{data.name}</h3>
        <p className="mt-1 text-base italic text-sky-900/85 dark:text-sky-100/85">{data.scientificName}</p>
        <p className="mt-3 text-sm text-sky-900/85 dark:text-sky-100/85">{data.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/my-field-guide"
            className="rounded-lg border border-sky-800/25 px-3 py-1.5 text-xs font-semibold text-sky-900 hover:bg-sky-100/60 dark:border-sky-200/20 dark:text-sky-100 dark:hover:bg-sky-900/40"
          >
            打开我的图鉴
          </Link>
        </div>
      </header>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-sky-900 dark:text-sky-200">分类</dt>
          <dd className="text-sky-900/85 dark:text-sky-100/80">{normalizeSpeciesTaxon(data.taxon)}</dd>
        </div>
        <div>
          <dt className="font-medium text-sky-900 dark:text-sky-200">栖息地</dt>
          <dd className="text-sky-900/85 dark:text-sky-100/80">{data.habitat}</dd>
        </div>
        <div>
          <dt className="font-medium text-sky-900 dark:text-sky-200">食性</dt>
          <dd className="text-sky-900/85 dark:text-sky-100/80">{data.diet}</dd>
        </div>
        <div>
          <dt className="font-medium text-sky-900 dark:text-sky-200">保护状况</dt>
          <dd className="text-sky-900/85 dark:text-sky-100/80">{data.conservation}</dd>
        </div>
      </dl>

      <div className="border-t border-sky-900/10 pt-4 dark:border-sky-100/10">
        <h4 className="text-sm font-semibold text-sky-950 dark:text-sky-50">身体结构与器官</h4>
        <div className="mt-2 max-h-[min(320px,45vh)] overflow-y-auto rounded-xl border border-sky-900/10 bg-white/80 p-3 dark:border-sky-100/10 dark:bg-sky-950/25">
          <MarkdownBody variant="exploreField" content={data.bodyStructureMarkdown} />
        </div>
      </div>

      <div className="border-t border-sky-900/10 pt-4 dark:border-sky-100/10">
        <h4 className="text-sm font-semibold text-sky-950 dark:text-sky-50">习性与行为</h4>
        <div className="mt-2 max-h-[min(320px,45vh)] overflow-y-auto rounded-xl border border-sky-900/10 bg-white/80 p-3 dark:border-sky-100/10 dark:bg-sky-950/25">
          <MarkdownBody variant="exploreField" content={data.habitsMarkdown} />
        </div>
      </div>

      <div className="border-t border-sky-900/10 pt-4 dark:border-sky-100/10">
        <h4 className="text-sm font-semibold text-sky-950 dark:text-sky-50">趣闻与冷知识</h4>
        <div className="mt-2 max-h-[min(280px,40vh)] overflow-y-auto rounded-xl border border-sky-900/10 bg-white/80 p-3 dark:border-sky-100/10 dark:bg-sky-950/25">
          <MarkdownBody variant="exploreField" content={data.funFactsMarkdown} />
        </div>
      </div>

      <div className="border-t border-sky-900/10 pt-4 dark:border-sky-100/10">
        <h4 className="text-sm font-semibold text-sky-950 dark:text-sky-50">相关报告与文献（站外检索）</h4>
        <p className="mt-1 text-xs text-sky-800/80 dark:text-sky-200/70">
          建议检索词：<span className="font-mono">{data.reportSearchQuery}</span>
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {reportSearchLinks(data.reportSearchQuery).map((r) => (
            <li key={r.label}>
              <a
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-lg border border-sky-800/25 px-3 py-1.5 text-xs font-medium text-sky-900 hover:bg-sky-100/60 dark:border-sky-200/20 dark:text-sky-100 dark:hover:bg-sky-900/40"
              >
                {r.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-sky-900/10 pt-4 dark:border-sky-100/10">
        <h4 className="text-sm font-semibold text-sky-950 dark:text-sky-50">概览正文</h4>
        <div className="mt-2 max-h-[min(480px,55vh)] overflow-y-auto rounded-xl border border-sky-900/10 bg-white/80 p-3 dark:border-sky-100/10 dark:bg-sky-950/25">
          <MarkdownBody variant="exploreField" content={data.bodyMarkdown} />
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-sky-900/10 pt-4 dark:border-sky-100/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void (async () => {
                const urls = galleryEditedUrls ?? baseSlides;
                const entry = await saveFieldGuideEntry({
                  ...data,
                  imageUrls: urls.length > 0 ? urls : undefined,
                  imageUrl: urls[0] ?? null,
                });
                prependFieldGuideListCache(entry);
                patchExplorePreview({
                  saveHint: `已加入「我的图鉴」（${urls.length > 0 ? `含 ${urls.length} 张配图` : "未含配图"}，已同步云端）。`,
                });
              })();
            }}
            className="rounded-xl bg-sky-800 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 dark:bg-sky-600"
          >
            加入我的图鉴
          </button>
          <Link
            href="/my-field-guide"
            className="inline-flex items-center justify-center rounded-xl border border-sky-800/30 px-4 py-2 text-sm font-semibold text-sky-900 hover:bg-sky-100/60 dark:border-sky-200/25 dark:text-sky-100 dark:hover:bg-sky-900/40"
          >
            查看我的图鉴
          </Link>
        </div>
        {saveHint ? <p className="text-sm text-emerald-800 dark:text-emerald-200">{saveHint}</p> : null}
      </div>
    </div>
  );
});

export function ExploreAnimals() {
  const [q, setQ] = useState(() => getExploreDraft().q);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<FieldGuideProgressPhase | null>(null);
  const [loadingQuery, setLoadingQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [disambiguation, setDisambiguation] = useState<{
    data: SpeciesDisambiguation;
    originalQuery: string;
  } | null>(null);
  const [nameSuggestion, setNameSuggestion] = useState<{
    data: SpeciesNameSuggestion;
    originalQuery: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      patchExploreQuery({ q });
    };
  }, [q]);

  async function fetchDisambiguation(query: string): Promise<SpeciesDisambiguation | null> {
    const res = await fetch("/api/explore-species", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, mode: "disambiguate" }),
      credentials: "same-origin",
    });
    const raw = await res.text();
    let json: ApiJson = {};
    try {
      json = raw ? (JSON.parse(raw) as ApiJson) : {};
    } catch {
      return null;
    }
    if (!res.ok) return null;
    if (json.status === "suggest_name" && json.suggestion) {
      return null;
    }
    const fromApi = pickDisambiguation(json);
    if (fromApi) return fromApi;
    return resolveCuratedSpeciesDisambiguation(query);
  }

  async function runExplore(query: string, opts?: ExploreRequestOptions) {
    setError(null);
    patchExplorePreview({ data: null, saveHint: null, galleryEditedUrls: null });
    if (!opts?.skipDisambiguation) {
      setDisambiguation(null);
      setNameSuggestion(null);
    }

    const res = await fetch("/api/explore-species", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        skipDisambiguation: opts?.skipDisambiguation === true,
        genericOverview: opts?.genericOverview === true,
        imageFallbackQuery: opts?.imageFallbackQuery?.trim() || undefined,
        forceQuery: opts?.forceQuery === true,
      }),
      credentials: "same-origin",
    });

    const raw = await res.text();
    let json: ApiJson;
    try {
      json = raw ? (JSON.parse(raw) as ApiJson) : {};
    } catch {
      throw new Error(
        res.status === 504
          ? "生成超时（HTTP 504）：图鉴生成超过服务器 120 秒限制。请稍后重试，或联系管理员将 Nginx proxy_read_timeout 调至 300s。"
          : `服务器返回了非 JSON 响应（HTTP ${res.status}）。请查看终端/部署日志，或确认接口未崩溃。`,
      );
    }

    if (!res.ok) {
      throw new Error(json.error ?? `请求失败（HTTP ${res.status}）`);
    }

    if (json.status === "suggest_name" && json.suggestion) {
      setNameSuggestion({
        data: json.suggestion,
        originalQuery: json.originalQuery ?? query,
      });
      return;
    }

    const disambig = !opts?.skipDisambiguation ? pickDisambiguation(json) : null;
    if (disambig) {
      setDisambiguation({
        data: disambig,
        originalQuery: json.originalQuery ?? query,
      });
      return;
    }

    if (json.status === "choose_species") {
      throw new Error("物种选项数据不完整，请重试或输入更具体的物种名。");
    }

    if (!json.species || typeof json.species !== "object") {
      throw new Error("返回数据缺少 species 字段，请稍后重试。");
    }

    setDisambiguation(null);
    setNameSuggestion(null);
    patchExplorePreview({
      data: json.species,
      galleryEditedUrls: null,
      saveHint: null,
    });
    if (opts?.skipDisambiguation && query !== (opts.inputQuery ?? getExploreDraft().q).trim()) {
      setQ(query);
      patchExploreQuery({ q: query });
    }
  }

  function openDisambiguation(query: string, disambig: SpeciesDisambiguation) {
    setError(null);
    patchExplorePreview({ data: null, saveHint: null, galleryEditedUrls: null });
    setDisambiguation({ data: disambig, originalQuery: query });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = normalizeExploreSpeciesQuery(q);
    if (!query) return;

    patchExploreQuery({ q: query });
    setError(null);

    setLoading(true);
    setLoadingQuery(query);
    try {
      setLoadingPhase("disambiguate");
      const disambigRes = await fetch("/api/explore-species", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, mode: "disambiguate" }),
        credentials: "same-origin",
      });
      const disambigRaw = await disambigRes.text();
      let disambigJson: ApiJson = {};
      try {
        disambigJson = disambigRaw ? (JSON.parse(disambigRaw) as ApiJson) : {};
      } catch {
        /* fall through */
      }
      if (disambigRes.ok && disambigJson.status === "suggest_name" && disambigJson.suggestion) {
        setNameSuggestion({
          data: disambigJson.suggestion,
          originalQuery: disambigJson.originalQuery ?? query,
        });
        return;
      }

      const disambig = await fetchDisambiguation(query);
      if (disambig) {
        openDisambiguation(query, disambig);
        return;
      }
      setLoadingPhase("generate");
      await runExplore(query, { skipDisambiguation: true, inputQuery: q });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "Failed to fetch" || msg.includes("Load failed")) {
        setError(
          "无法连接服务器（Failed to fetch）。请确认本页与接口同源、开发服务已启动，或检查是否被代理/防火墙拦截。",
        );
      } else {
        setError(msg.startsWith("请求异常：") ? msg : `请求异常：${msg}`);
      }
    } finally {
      setLoading(false);
      setLoadingPhase(null);
      setLoadingQuery("");
    }
  }

  async function onDisambiguationSelect(speciesQuery: string) {
    const groupQuery = disambiguation?.originalQuery;
    setDisambiguation(null);
    setLoading(true);
    setLoadingQuery(speciesQuery);
    setLoadingPhase("generate");
    try {
      await runExplore(speciesQuery, {
        skipDisambiguation: true,
        imageFallbackQuery: groupQuery,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingPhase(null);
      setLoadingQuery("");
    }
  }

  async function onDisambiguationGeneric() {
    if (!disambiguation) return;
    const original = disambiguation.originalQuery;
    setDisambiguation(null);
    setLoading(true);
    setLoadingQuery(original);
    setLoadingPhase("generate");
    try {
      await runExplore(original, { skipDisambiguation: true, genericOverview: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingPhase(null);
      setLoadingQuery("");
    }
  }

  async function onNameSuggestionAccept(suggestedQuery: string) {
    setNameSuggestion(null);
    setQ(suggestedQuery);
    patchExploreQuery({ q: suggestedQuery });
    setLoading(true);
    setLoadingQuery(suggestedQuery);
    setLoadingPhase("generate");
    try {
      await runExplore(suggestedQuery, { skipDisambiguation: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingPhase(null);
      setLoadingQuery("");
    }
  }

  async function onNameSuggestionForceOriginal() {
    if (!nameSuggestion) return;
    const original = nameSuggestion.originalQuery;
    setNameSuggestion(null);
    setLoading(true);
    setLoadingQuery(original);
    setLoadingPhase("generate");
    try {
      await runExplore(original, { skipDisambiguation: true, forceQuery: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingPhase(null);
      setLoadingQuery("");
    }
  }

  return (
    <section className="rounded-3xl border border-sky-900/10 bg-gradient-to-br from-sky-50 to-white p-8 shadow-sm dark:border-sky-100/10 dark:from-sky-950 dark:to-sky-950/40">
      <h2 className="text-xl font-semibold text-sky-950 dark:text-sky-50">探索动物</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sky-900/85 dark:text-sky-100/85">
        建议输入精确到种的常用名或拉丁学名。内容为 AI 生成，
        <strong className="font-semibold">较冷门物种配图可能不准确或缺失，可上传自己的图片，注意甄别。</strong>
      </p>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="explore-q" className="block text-sm font-medium text-sky-900 dark:text-sky-100">
            动物名称
          </label>
          <input
            id="explore-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onBlur={() => patchExploreQuery({ q })}
            maxLength={80}
            placeholder="例如：东北虎、羚牛、雪豹"
            className="mt-1 w-full rounded-xl border border-sky-900/15 bg-white px-3 py-2 text-sm text-sky-950 shadow-inner dark:border-sky-100/15 dark:bg-sky-950 dark:text-sky-50"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="shrink-0 rounded-xl bg-sky-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
        >
          {loading ? "生成中…" : "AI 生成预览"}
        </button>
      </form>

      {error ? (
        <p className="mt-4 text-sm text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {loading && loadingPhase ? (
        <FieldGuideGenerationProgress phase={loadingPhase} query={loadingQuery} />
      ) : null}

      <ExploreSpeciesPreview />

      {nameSuggestion ? (
        <SpeciesNameSuggestionModal
          originalQuery={nameSuggestion.originalQuery}
          suggestion={nameSuggestion.data}
          onAccept={onNameSuggestionAccept}
          onForceOriginal={onNameSuggestionForceOriginal}
          onClose={() => setNameSuggestion(null)}
        />
      ) : null}

      {disambiguation ? (
        <SpeciesDisambiguationModal
          data={disambiguation.data}
          originalQuery={disambiguation.originalQuery}
          onSelectSpecies={onDisambiguationSelect}
          onGenericOverview={onDisambiguationGeneric}
          onClose={() => setDisambiguation(null)}
        />
      ) : null}
    </section>
  );
}
