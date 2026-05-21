import {
  collectQueryTokens,
  scoreSpeciesImageCandidate,
  speciesImageStrictAnimalFilter,
} from "@/lib/species-image-relevance";
import type { SpeciesImageSearchContext } from "@/lib/species-image-search-context";

const UNSPLASH_FETCH_MS = 12_000;

export type SpeciesImageProvider = "unsplash" | null;

export type SpeciesImageResult = {
  url: string | null;
  provider: SpeciesImageProvider;
};

export type SpeciesGalleryResult = {
  urls: string[];
  provider: SpeciesImageProvider;
};

const DEFAULT_GALLERY_MAX = 4;

function galleryMaxSlides(): number {
  const raw = process.env.SPECIES_GALLERY_MAX?.trim();
  if (!raw) return DEFAULT_GALLERY_MAX;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_GALLERY_MAX;
  return Math.min(n, 20);
}

function pickUnsplashPhotoUrl(item: {
  urls?: {
    thumb?: string;
    small?: string;
    regular?: string;
    full?: string;
    raw?: string;
  };
}): string | null {
  const urls = item.urls;
  const raw =
    urls?.regular ??
    urls?.small ??
    urls?.thumb ??
    urls?.full ??
    (typeof urls?.raw === "string"
      ? `${urls.raw.split("?")[0]}?w=1080&q=80`
      : undefined);
  if (typeof raw === "string" && raw.startsWith("https://")) return raw;
  return null;
}

function httpSignal(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  return undefined;
}

/** 单一英文检索串 */
function buildUnsplashQuery(ctx: SpeciesImageSearchContext): string | null {
  const en = ctx.searchQueryEn.trim();
  if (!en || /[\u4e00-\u9fff]/.test(en)) return null;
  return `${en} wildlife animal`.slice(0, 120);
}

async function resolveUnsplashSpeciesImages(
  ctx: SpeciesImageSearchContext,
  max: number,
): Promise<string[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key) return [];

  const query = buildUnsplashQuery(ctx);
  if (!query) return [];

  const perPage = Math.min(30, Math.max(max * 3, 15));
  const strict = speciesImageStrictAnimalFilter();
  const queryTokens = collectQueryTokens(
    ctx.nameZh,
    ctx.scientificName,
    ctx.searchQueryEn,
  );
  const collected: string[] = [];
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const scoredFallback: Array<{ url: string; score: number }> = [];
  const minScore = strict ? 1 : -5;

  const u = new URL("https://api.unsplash.com/search/photos");
  u.searchParams.set("query", query);
  u.searchParams.set("per_page", String(perPage));
  u.searchParams.set("content_filter", "high");
  u.searchParams.set("orientation", "landscape");

  try {
    const res = await fetch(u.toString(), {
      headers: { Authorization: `Client-ID ${key}` },
      cache: "no-store",
      signal: httpSignal(UNSPLASH_FETCH_MS),
    });
    if (!res.ok) {
      if (process.env.UNSPLASH_DEBUG === "1") {
        const snippet = await res.text().catch(() => "");
        console.warn("[species-image][unsplash] HTTP", res.status, snippet.slice(0, 200));
      }
      return [];
    }
    const j = (await res.json()) as {
      results?: Array<{
        id?: string;
        description?: string | null;
        alt_description?: string | null;
        tags?: Array<{ title?: string }>;
        tags_preview?: Array<{ title?: string }>;
        urls?: {
          thumb?: string;
          small?: string;
          regular?: string;
          full?: string;
          raw?: string;
        };
      }>;
    };
    const list = j.results ?? [];
    if (list.length === 0 && process.env.UNSPLASH_DEBUG === "1") {
      console.warn("[species-image][unsplash] empty results, query=", query);
    }
    for (const item of list) {
      if (collected.length >= max) break;
      const pid = typeof item.id === "string" ? item.id : "";
      if (pid && seenIds.has(pid)) continue;
      const href = pickUnsplashPhotoUrl(item);
      if (!href || seenUrls.has(href)) continue;

      const tags = item.tags?.length ? item.tags : item.tags_preview;
      const score = scoreSpeciesImageCandidate(
        {
          description: item.description,
          alt_description: item.alt_description,
          tags,
        },
        queryTokens,
      );

      if (score < minScore) {
        if (score > -100) scoredFallback.push({ url: href, score });
        continue;
      }

      if (pid) seenIds.add(pid);
      seenUrls.add(href);
      collected.push(href);
      scoredFallback.push({ url: href, score });
    }
  } catch (e) {
    if (process.env.UNSPLASH_DEBUG === "1") {
      console.warn("[species-image][unsplash] fetch error", e);
    }
  }

  if (collected.length < max && scoredFallback.length > 0) {
    scoredFallback.sort((a, b) => b.score - a.score);
    for (const row of scoredFallback) {
      if (collected.length >= max) break;
      if (seenUrls.has(row.url)) continue;
      if (strict && row.score < 0) continue;
      seenUrls.add(row.url);
      collected.push(row.url);
    }
  }

  if (process.env.UNSPLASH_DEBUG === "1" && collected.length > 0) {
    console.warn("[species-image][unsplash] gallery", collected.length, "query=", query);
  }

  return collected;
}

/**
 * 先用具体种的英译搜图；无结果时再用 fallback 上下文（如用户最初输入的统称英译）。
 */
export async function resolveSpeciesGalleryWithFallback(
  primary: SpeciesGalleryInput,
  fallbackCtx: SpeciesImageSearchContext | null,
): Promise<SpeciesGalleryResult> {
  const primaryResult = await resolveSpeciesGallery(primary);
  if (primaryResult.urls.length > 0) return primaryResult;

  if (!fallbackCtx?.searchQueryEn.trim()) return primaryResult;

  const primaryEn = primary.imageSearchContext.searchQueryEn.trim().toLowerCase();
  const fallbackEn = fallbackCtx.searchQueryEn.trim().toLowerCase();
  if (!fallbackEn || fallbackEn === primaryEn) return primaryResult;

  if (process.env.UNSPLASH_DEBUG === "1") {
    console.warn(
      "[species-image] primary empty, fallback to group query",
      primaryEn,
      "->",
      fallbackEn,
    );
  }

  return resolveSpeciesGallery({
    userQuery: fallbackCtx.nameZh,
    scientificName: primary.scientificName,
    imageSearchContext: fallbackCtx,
  });
}

/**
 * `SPECIES_IMAGE_SOURCE`：默认仅 Unsplash（需 UNSPLASH_ACCESS_KEY）。
 * `none` 不请求配图；`wiki_only` / `wikipedia` 已废弃，等同 `none`。
 */
export type SpeciesGalleryInput = {
  userQuery: string;
  scientificName: string;
  /** 须由路由传入：已译好的英文检索词 */
  imageSearchContext: SpeciesImageSearchContext;
};

export async function resolveSpeciesGallery(opts: SpeciesGalleryInput): Promise<SpeciesGalleryResult> {
  const max = galleryMaxSlides();
  const mode = (process.env.SPECIES_IMAGE_SOURCE ?? "auto").trim().toLowerCase();

  if (mode === "none" || mode === "wiki_only" || mode === "wikipedia") {
    return { urls: [], provider: null };
  }

  const ctx = opts.imageSearchContext;
  if (!ctx.searchQueryEn.trim()) {
    return { urls: [], provider: null };
  }

  const urls = await resolveUnsplashSpeciesImages(ctx, max);
  if (urls.length > 0) return { urls, provider: "unsplash" };
  return { urls: [], provider: null };
}

export async function resolveSpeciesThumbnail(opts: SpeciesGalleryInput): Promise<SpeciesImageResult> {
  const g = await resolveSpeciesGallery(opts);
  return { url: g.urls[0] ?? null, provider: g.provider };
}
