import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAuthResponse, requireUser } from "@/lib/auth/require-user";
import {
  insertUserFieldGuide,
  listUserFieldGuides,
} from "@/lib/user-data/field-guides-server";
import type { ExploreSpeciesPayload } from "@/lib/explore-species";
import type { FieldGuideSavedEntry } from "@/lib/personal-field-guide";
import { fieldGuideCoverImage } from "@/lib/species-image-slides";
import { fieldGuideSpeciesMatches } from "@/lib/field-guide-match";

export const runtime = "nodejs";

function normalizeSpecies(species: ExploreSpeciesPayload): ExploreSpeciesPayload {
  const apiUrls =
    species.imageUrls?.filter((u) => typeof u === "string" && u.trim()).map((u) => u.trim()) ?? [];
  const firstApi =
    typeof species.imageUrl === "string" && species.imageUrl.trim()
      ? species.imageUrl.trim()
      : apiUrls[0];
  const userUploaded =
    species.userUploadedImages?.filter((u) => typeof u === "string" && u.trim()).map((u) => u.trim()) ??
    [];
  const merged: ExploreSpeciesPayload = {
    ...species,
    imageUrls: apiUrls.length > 0 ? apiUrls : firstApi ? [firstApi] : undefined,
    imageUrl: firstApi ?? null,
    userUploadedImages: userUploaded.length > 0 ? userUploaded : undefined,
  };
  const cover = fieldGuideCoverImage(merged);
  return { ...merged, coverImageUrl: cover, imageUrl: cover };
}

export async function GET() {
  const userOrRes = await requireUser();
  if (isAuthResponse(userOrRes)) return userOrRes;
  try {
    const entries = await listUserFieldGuides(userOrRes.id);
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ error: "读取图鉴失败。" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const userOrRes = await requireUser();
  if (isAuthResponse(userOrRes)) return userOrRes;
  let body: { species?: ExploreSpeciesPayload; id?: string; savedAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON。" }, { status: 400 });
  }
  if (!body.species || typeof body.species !== "object") {
    return NextResponse.json({ error: "缺少 species。" }, { status: 400 });
  }
  const normalizedSpecies = normalizeSpecies(body.species);
  const existingEntries = await listUserFieldGuides(userOrRes.id);
  const duplicate = existingEntries.find((e) =>
    fieldGuideSpeciesMatches(e.species, normalizedSpecies),
  );
  if (duplicate) {
    return NextResponse.json({ entry: duplicate, duplicate: true });
  }
  const entry: FieldGuideSavedEntry = {
    id: body.id ?? randomUUID(),
    savedAt: body.savedAt ?? new Date().toISOString(),
    starred: false,
    species: normalizedSpecies,
  };
  try {
    await insertUserFieldGuide(userOrRes.id, entry);
    return NextResponse.json({ entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "保存失败";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
