import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { QuestionBankSet } from "@/lib/question-bank";

const MAX_SETS = 50;

export async function listUserQuestionSets(userId: string): Promise<QuestionBankSet[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.userQuestionSets)
    .where(eq(schema.userQuestionSets.userId, userId))
    .orderBy(desc(schema.userQuestionSets.savedAt))
    .limit(MAX_SETS);
  return rows.map((r) => ({
    id: r.id,
    savedAt: r.savedAt.toISOString(),
    fieldGuideId: r.fieldGuideId,
    speciesName: r.speciesName,
    title: r.title,
    questions: r.questions as QuestionBankSet["questions"],
    gradingStandard: r.gradingStandard as QuestionBankSet["gradingStandard"],
  }));
}

export async function insertUserQuestionSet(userId: string, set: QuestionBankSet): Promise<void> {
  const db = getDb();
  const count = await db
    .select({ id: schema.userQuestionSets.id })
    .from(schema.userQuestionSets)
    .where(eq(schema.userQuestionSets.userId, userId));
  if (count.length >= MAX_SETS) {
    throw new Error(`题库最多 ${MAX_SETS} 组。`);
  }
  await db.insert(schema.userQuestionSets).values({
    id: set.id,
    userId,
    savedAt: new Date(set.savedAt),
    fieldGuideId: set.fieldGuideId,
    speciesName: set.speciesName,
    title: set.title,
    questions: set.questions,
    gradingStandard: set.gradingStandard,
  });
}

export async function deleteUserQuestionSet(userId: string, id: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(schema.userQuestionSets)
    .where(eq(schema.userQuestionSets.id, id))
    .returning({ userId: schema.userQuestionSets.userId });
  return deleted[0]?.userId === userId;
}

export async function upsertUserQuestionSets(
  userId: string,
  sets: QuestionBankSet[],
): Promise<number> {
  let added = 0;
  const existing = await listUserQuestionSets(userId);
  const ids = new Set(existing.map((s) => s.id));
  for (const set of sets) {
    if (ids.has(set.id)) continue;
    try {
      await insertUserQuestionSet(userId, set);
      added++;
      ids.add(set.id);
    } catch {
      break;
    }
  }
  return added;
}
