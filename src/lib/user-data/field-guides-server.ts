import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { ExploreSpeciesPayload } from "@/lib/explore-species";
import type { FieldGuideSavedEntry } from "@/lib/personal-field-guide";

const MAX_ENTRIES = 40;

export async function listUserFieldGuides(userId: string): Promise<FieldGuideSavedEntry[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.userFieldGuides)
    .where(eq(schema.userFieldGuides.userId, userId))
    .orderBy(desc(schema.userFieldGuides.savedAt))
    .limit(MAX_ENTRIES);
  return rows.map((r) => ({
    id: r.id,
    savedAt: r.savedAt.toISOString(),
    starred: r.starred,
    species: r.species as ExploreSpeciesPayload,
  }));
}

export async function getUserFieldGuide(
  userId: string,
  id: string,
): Promise<FieldGuideSavedEntry | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.userFieldGuides)
    .where(eq(schema.userFieldGuides.id, id))
    .limit(1);
  const r = rows[0];
  if (!r || r.userId !== userId) return null;
  return {
    id: r.id,
    savedAt: r.savedAt.toISOString(),
    starred: r.starred,
    species: r.species as ExploreSpeciesPayload,
  };
}

export async function insertUserFieldGuide(
  userId: string,
  entry: FieldGuideSavedEntry,
): Promise<void> {
  const db = getDb();
  const count = await db
    .select({ id: schema.userFieldGuides.id })
    .from(schema.userFieldGuides)
    .where(eq(schema.userFieldGuides.userId, userId));
  if (count.length >= MAX_ENTRIES) {
    throw new Error(`最多保存 ${MAX_ENTRIES} 条图鉴。请先删除旧条目。`);
  }
  await db.insert(schema.userFieldGuides).values({
    id: entry.id,
    userId,
    savedAt: new Date(entry.savedAt),
    starred: entry.starred ?? false,
    species: entry.species,
  });
}

export async function updateUserFieldGuideSpecies(
  userId: string,
  id: string,
  species: ExploreSpeciesPayload,
): Promise<boolean> {
  const db = getDb();
  const updated = await db
    .update(schema.userFieldGuides)
    .set({ species, updatedAt: new Date() })
    .where(eq(schema.userFieldGuides.id, id))
    .returning({ userId: schema.userFieldGuides.userId });
  return updated[0]?.userId === userId;
}

export async function updateUserFieldGuideStarred(
  userId: string,
  id: string,
  starred: boolean,
): Promise<boolean> {
  const db = getDb();
  const updated = await db
    .update(schema.userFieldGuides)
    .set({ starred, updatedAt: new Date() })
    .where(eq(schema.userFieldGuides.id, id))
    .returning({ userId: schema.userFieldGuides.userId });
  return updated[0]?.userId === userId;
}

export async function deleteUserFieldGuide(userId: string, id: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(schema.userFieldGuides)
    .where(eq(schema.userFieldGuides.id, id))
    .returning({ userId: schema.userFieldGuides.userId });
  return deleted[0]?.userId === userId;
}

export async function upsertUserFieldGuides(
  userId: string,
  entries: FieldGuideSavedEntry[],
): Promise<number> {
  let added = 0;
  for (const entry of entries.slice(0, MAX_ENTRIES)) {
    const existing = await getUserFieldGuide(userId, entry.id);
    if (existing) continue;
    try {
      await insertUserFieldGuide(userId, entry);
      added++;
    } catch {
      /* 已满则跳过 */
    }
  }
  return added;
}
