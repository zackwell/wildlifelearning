import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { LiteratureMeta } from "@/lib/rag/types";
import {
  migrateLegacyLiteratureDocument,
  readLiteratureDocument,
} from "@/lib/literature/server-store";

const MAX_ENTRIES = 30;

export async function listUserLiteratureMeta(userId: string): Promise<LiteratureMeta[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.userLiteratureMeta)
    .where(eq(schema.userLiteratureMeta.userId, userId))
    .orderBy(desc(schema.userLiteratureMeta.uploadedAt))
    .limit(MAX_ENTRIES);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    fileName: r.fileName,
    uploadedAt: r.uploadedAt.toISOString(),
    enabledForAsk: r.enabledForAsk,
  }));
}

export async function insertUserLiteratureMeta(
  userId: string,
  meta: Omit<LiteratureMeta, "enabledForAsk"> & { enabledForAsk?: boolean },
): Promise<LiteratureMeta> {
  const db = getDb();
  const count = await db
    .select({ id: schema.userLiteratureMeta.id })
    .from(schema.userLiteratureMeta)
    .where(eq(schema.userLiteratureMeta.userId, userId));
  if (count.length >= MAX_ENTRIES) {
    throw new Error(`最多上传 ${MAX_ENTRIES} 篇文献。`);
  }
  const entry: LiteratureMeta = {
    id: meta.id,
    title: meta.title,
    fileName: meta.fileName,
    uploadedAt: meta.uploadedAt,
    enabledForAsk: meta.enabledForAsk ?? true,
  };
  await db.insert(schema.userLiteratureMeta).values({
    id: entry.id,
    userId,
    title: entry.title,
    fileName: entry.fileName,
    uploadedAt: new Date(entry.uploadedAt),
    enabledForAsk: entry.enabledForAsk,
  });
  return entry;
}

export async function setUserLiteratureEnabled(
  userId: string,
  id: string,
  enabled: boolean,
): Promise<boolean> {
  const db = getDb();
  const updated = await db
    .update(schema.userLiteratureMeta)
    .set({ enabledForAsk: enabled })
    .where(eq(schema.userLiteratureMeta.id, id))
    .returning({ userId: schema.userLiteratureMeta.userId });
  return updated[0]?.userId === userId;
}

export async function deleteUserLiteratureMeta(userId: string, id: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(schema.userLiteratureMeta)
    .where(eq(schema.userLiteratureMeta.id, id))
    .returning({ userId: schema.userLiteratureMeta.userId });
  return deleted[0]?.userId === userId;
}

export async function userOwnsLiterature(userId: string, id: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ userId: schema.userLiteratureMeta.userId })
    .from(schema.userLiteratureMeta)
    .where(eq(schema.userLiteratureMeta.id, id))
    .limit(1);
  return rows[0]?.userId === userId;
}

export async function getUserEnabledLiteratureIds(userId: string): Promise<string[]> {
  const list = await listUserLiteratureMeta(userId);
  return list.filter((m) => m.enabledForAsk).map((m) => m.id);
}

export async function migrateUserLiteratureMetas(
  userId: string,
  metas: LiteratureMeta[],
): Promise<number> {
  let added = 0;
  const existing = await listUserLiteratureMeta(userId);
  const ids = new Set(existing.map((m) => m.id));
  for (const meta of metas) {
    if (ids.has(meta.id)) continue;
    migrateLegacyLiteratureDocument(userId, meta.id);
    if (!readLiteratureDocument(userId, meta.id)) continue;
    try {
      await insertUserLiteratureMeta(userId, meta);
      added++;
      ids.add(meta.id);
    } catch {
      break;
    }
  }
  return added;
}
