import type { ExploreSpeciesPayload } from "@/lib/explore-species";

function trimUrls(urls: string[] | undefined): string[] {
  if (!urls?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const t = u.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** 探索预览：仅网络检索图 */
export function speciesImageSlides(
  species: Pick<ExploreSpeciesPayload, "imageUrl" | "imageUrls">,
): string[] {
  const fromArr = trimUrls(species.imageUrls);
  if (fromArr.length > 0) return fromArr;
  const one = species.imageUrl;
  if (typeof one === "string" && one.trim().length > 0) return [one.trim()];
  return [];
}

/** 我的图鉴：网络图 + 用户上传 */
export function fieldGuideAllSlides(
  species: Pick<ExploreSpeciesPayload, "imageUrl" | "imageUrls" | "userUploadedImages">,
): string[] {
  const api = speciesImageSlides(species);
  const user = trimUrls(species.userUploadedImages);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of [...api, ...user]) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

/** 图鉴列表缩略图 / 封面 */
export function fieldGuideCoverImage(
  species: Pick<
    ExploreSpeciesPayload,
    "imageUrl" | "imageUrls" | "userUploadedImages" | "coverImageUrl"
  >,
): string | null {
  const all = fieldGuideAllSlides(species);
  const cover = species.coverImageUrl?.trim();
  if (cover && all.includes(cover)) return cover;
  if (typeof species.imageUrl === "string" && species.imageUrl.trim()) {
    const u = species.imageUrl.trim();
    if (all.includes(u)) return u;
  }
  return all[0] ?? null;
}

export function isUserUploadedImage(url: string): boolean {
  return url.startsWith("data:image/");
}

export function isWikimediaUpload(url: string): boolean {
  try {
    return new URL(url).hostname === "upload.wikimedia.org";
  } catch {
    return false;
  }
}

export function isUnsplashCdn(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === "images.unsplash.com" || h.endsWith(".unsplash.com");
  } catch {
    return false;
  }
}

/** Unsplash 直连 CDN，不经 /_next/image，减轻服务器代理与压缩开销。 */
export function canUseNextImageForUrl(url: string): boolean {
  return isWikimediaUpload(url);
}
