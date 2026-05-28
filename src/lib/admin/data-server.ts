import fs from "node:fs";
import path from "node:path";
import { deleteUserDataDir } from "@/lib/user-data/user-files";
import { count, desc, eq, gte, lt } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { deleteLiteratureDocument } from "@/lib/literature/server-store";

export type AdminStats = {
  users: number;
  fieldGuides: number;
  questionSets: number;
  literatureMeta: number;
  sessions: number;
  usersToday: number;
  fieldGuidesToday: number;
  literatureFilesBytes: number;
  literatureFilesCount: number;
  ragJsonBytes: number;
};

function fileSizeIfExists(filePath: string): number {
  try {
    if (!fs.existsSync(filePath)) return 0;
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function dirLiteratureStats(): { bytes: number; count: number } {
  const usersRoot = path.join(process.cwd(), "data", "users");
  let bytes = 0;
  let countFiles = 0;
  try {
    if (!fs.existsSync(usersRoot)) return { bytes: 0, count: 0 };
    for (const userId of fs.readdirSync(usersRoot)) {
      const litDir = path.join(usersRoot, userId, "literature");
      if (!fs.existsSync(litDir)) continue;
      for (const file of fs.readdirSync(litDir)) {
        if (!file.endsWith(".json")) continue;
        const p = path.join(litDir, file);
        try {
          bytes += fs.statSync(p).size;
          countFiles++;
        } catch {
          /* skip */
        }
      }
    }
  } catch {
    return { bytes: 0, count: 0 };
  }
  return { bytes, count: countFiles };
}

export async function getAdminStats(): Promise<AdminStats> {
  const db = getDb();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    usersRow,
    fieldGuidesRow,
    questionSetsRow,
    literatureRow,
    sessionsRow,
    usersTodayRow,
    fieldGuidesTodayRow,
  ] = await Promise.all([
    db.select({ n: count() }).from(schema.users),
    db.select({ n: count() }).from(schema.userFieldGuides),
    db.select({ n: count() }).from(schema.userQuestionSets),
    db.select({ n: count() }).from(schema.userLiteratureMeta),
    db.select({ n: count() }).from(schema.sessions),
    db
      .select({ n: count() })
      .from(schema.users)
      .where(gte(schema.users.createdAt, todayStart)),
    db
      .select({ n: count() })
      .from(schema.userFieldGuides)
      .where(gte(schema.userFieldGuides.savedAt, todayStart)),
  ]);

  const litFiles = dirLiteratureStats();
  const ragPath = path.join(process.cwd(), "data", "rag.json");

  return {
    users: usersRow[0]?.n ?? 0,
    fieldGuides: fieldGuidesRow[0]?.n ?? 0,
    questionSets: questionSetsRow[0]?.n ?? 0,
    literatureMeta: literatureRow[0]?.n ?? 0,
    sessions: sessionsRow[0]?.n ?? 0,
    usersToday: usersTodayRow[0]?.n ?? 0,
    fieldGuidesToday: fieldGuidesTodayRow[0]?.n ?? 0,
    literatureFilesBytes: litFiles.bytes,
    literatureFilesCount: litFiles.count,
    ragJsonBytes: fileSizeIfExists(ragPath),
  };
}

export type AdminUserRow = {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  fieldGuideCount: number;
  literatureCount: number;
  questionSetCount: number;
};

export async function listAdminUsers(limit = 100, offset = 0): Promise<AdminUserRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      displayName: schema.users.displayName,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .orderBy(desc(schema.users.createdAt))
    .limit(limit)
    .offset(offset);

  const out: AdminUserRow[] = [];
  for (const row of rows) {
    const [fg, lit, qs] = await Promise.all([
      db
        .select({ n: count() })
        .from(schema.userFieldGuides)
        .where(eq(schema.userFieldGuides.userId, row.id)),
      db
        .select({ n: count() })
        .from(schema.userLiteratureMeta)
        .where(eq(schema.userLiteratureMeta.userId, row.id)),
      db
        .select({ n: count() })
        .from(schema.userQuestionSets)
        .where(eq(schema.userQuestionSets.userId, row.id)),
    ]);
    out.push({
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      createdAt: row.createdAt.toISOString(),
      fieldGuideCount: fg[0]?.n ?? 0,
      literatureCount: lit[0]?.n ?? 0,
      questionSetCount: qs[0]?.n ?? 0,
    });
  }
  return out;
}

export { deleteUserDataDir } from "@/lib/user-data/user-files";

export async function deleteAdminUser(userId: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(schema.users)
    .where(eq(schema.users.id, userId))
    .returning({ id: schema.users.id });
  if (!deleted[0]) return false;
  deleteUserDataDir(userId);
  return true;
}

export type AdminFieldGuideRow = {
  id: string;
  userId: string;
  userEmail: string;
  speciesName: string;
  scientificName: string;
  savedAt: string;
  starred: boolean;
};

export async function listAdminFieldGuides(
  limit = 100,
  offset = 0,
  query?: string,
): Promise<AdminFieldGuideRow[]> {
  const db = getDb();
  const q = query?.trim().toLowerCase();

  const rows = await db
    .select({
      id: schema.userFieldGuides.id,
      userId: schema.userFieldGuides.userId,
      userEmail: schema.users.email,
      species: schema.userFieldGuides.species,
      savedAt: schema.userFieldGuides.savedAt,
      starred: schema.userFieldGuides.starred,
    })
    .from(schema.userFieldGuides)
    .innerJoin(schema.users, eq(schema.userFieldGuides.userId, schema.users.id))
    .orderBy(desc(schema.userFieldGuides.savedAt))
    .limit(limit)
    .offset(offset);

  const out: AdminFieldGuideRow[] = [];
  for (const row of rows) {
    const species = row.species as { name?: string; scientificName?: string };
    const name = species.name?.trim() || "未命名";
    const scientificName = species.scientificName?.trim() || "";
    if (q) {
      const hay = `${name} ${scientificName} ${row.userEmail}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }
    out.push({
      id: row.id,
      userId: row.userId,
      userEmail: row.userEmail,
      speciesName: name,
      scientificName,
      savedAt: row.savedAt.toISOString(),
      starred: row.starred,
    });
  }
  return out;
}

export async function deleteAdminFieldGuide(id: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(schema.userFieldGuides)
    .where(eq(schema.userFieldGuides.id, id))
    .returning({ id: schema.userFieldGuides.id });
  return Boolean(deleted[0]);
}

export type AdminLiteratureRow = {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  fileName: string;
  uploadedAt: string;
  enabledForAsk: boolean;
  fileBytes: number | null;
};

export async function listAdminLiterature(
  limit = 100,
  offset = 0,
  query?: string,
): Promise<AdminLiteratureRow[]> {
  const db = getDb();
  const q = query?.trim().toLowerCase();

  const rows = await db
    .select({
      id: schema.userLiteratureMeta.id,
      userId: schema.userLiteratureMeta.userId,
      userEmail: schema.users.email,
      title: schema.userLiteratureMeta.title,
      fileName: schema.userLiteratureMeta.fileName,
      uploadedAt: schema.userLiteratureMeta.uploadedAt,
      enabledForAsk: schema.userLiteratureMeta.enabledForAsk,
    })
    .from(schema.userLiteratureMeta)
    .innerJoin(schema.users, eq(schema.userLiteratureMeta.userId, schema.users.id))
    .orderBy(desc(schema.userLiteratureMeta.uploadedAt))
    .limit(limit)
    .offset(offset);

  const out: AdminLiteratureRow[] = [];
  for (const row of rows) {
    if (q) {
      const hay = `${row.title} ${row.fileName} ${row.userEmail}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }
    const filePath = path.join(
      process.cwd(),
      "data",
      "users",
      row.userId,
      "literature",
      `${row.id}.json`,
    );
    let fileBytes: number | null = null;
    try {
      if (fs.existsSync(filePath)) fileBytes = fs.statSync(filePath).size;
    } catch {
      fileBytes = null;
    }
    out.push({
      id: row.id,
      userId: row.userId,
      userEmail: row.userEmail,
      title: row.title,
      fileName: row.fileName,
      uploadedAt: row.uploadedAt.toISOString(),
      enabledForAsk: row.enabledForAsk,
      fileBytes,
    });
  }
  return out;
}

export async function deleteAdminLiterature(
  userId: string,
  id: string,
): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(schema.userLiteratureMeta)
    .where(eq(schema.userLiteratureMeta.id, id))
    .returning({
      id: schema.userLiteratureMeta.id,
      userId: schema.userLiteratureMeta.userId,
    });
  const row = deleted[0];
  if (!row || row.userId !== userId) return false;
  deleteLiteratureDocument(userId, id);
  return true;
}

export async function purgeExpiredUserSessions(): Promise<number> {
  const db = getDb();
  const result = await db
    .delete(schema.sessions)
    .where(lt(schema.sessions.expiresAt, new Date()))
    .returning({ id: schema.sessions.id });
  return result.length;
}
