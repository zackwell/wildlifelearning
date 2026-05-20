import { NextResponse } from "next/server";
import { isAuthResponse, requireUser } from "@/lib/auth/require-user";
import {
  deleteUserFieldGuide,
  getUserFieldGuide,
  updateUserFieldGuideSpecies,
  updateUserFieldGuideStarred,
} from "@/lib/user-data/field-guides-server";
import type { ExploreSpeciesPayload } from "@/lib/explore-species";
import { fieldGuideCoverImage } from "@/lib/species-image-slides";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

function normalizeSpecies(species: ExploreSpeciesPayload): ExploreSpeciesPayload {
  const cover = fieldGuideCoverImage(species);
  return { ...species, coverImageUrl: cover, imageUrl: cover };
}

export async function GET(_req: Request, props: Props) {
  const userOrRes = await requireUser();
  if (isAuthResponse(userOrRes)) return userOrRes;
  const { id } = await props.params;
  const entry = await getUserFieldGuide(userOrRes.id, id);
  if (!entry) {
    return NextResponse.json({ error: "未找到该图鉴。" }, { status: 404 });
  }
  return NextResponse.json({ entry });
}

export async function PATCH(req: Request, props: Props) {
  const userOrRes = await requireUser();
  if (isAuthResponse(userOrRes)) return userOrRes;
  const { id } = await props.params;
  let body: { species?: ExploreSpeciesPayload; starred?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON。" }, { status: 400 });
  }

  if (typeof body.starred === "boolean") {
    const ok = await updateUserFieldGuideStarred(userOrRes.id, id, body.starred);
    if (!ok) {
      return NextResponse.json({ error: "未找到该图鉴。" }, { status: 404 });
    }
    const entry = await getUserFieldGuide(userOrRes.id, id);
    return NextResponse.json({ entry });
  }

  if (!body.species) {
    return NextResponse.json({ error: "缺少 species 或 starred。" }, { status: 400 });
  }
  const species = normalizeSpecies(body.species);
  const ok = await updateUserFieldGuideSpecies(userOrRes.id, id, species);
  if (!ok) {
    return NextResponse.json({ error: "未找到该图鉴。" }, { status: 404 });
  }
  const entry = await getUserFieldGuide(userOrRes.id, id);
  return NextResponse.json({ entry });
}

export async function DELETE(_req: Request, props: Props) {
  const userOrRes = await requireUser();
  if (isAuthResponse(userOrRes)) return userOrRes;
  const { id } = await props.params;
  const ok = await deleteUserFieldGuide(userOrRes.id, id);
  if (!ok) {
    return NextResponse.json({ error: "未找到该图鉴。" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
