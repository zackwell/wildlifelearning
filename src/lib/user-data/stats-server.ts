import { and, count, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { QuestionBankSet } from "@/lib/question-bank";

export type UserContentStats = {
  fieldGuides: number;
  fieldGuidesStarred: number;
  questionSets: number;
  questions: number;
  literature: number;
  literatureEnabledForAsk: number;
};

export const EMPTY_USER_CONTENT_STATS: UserContentStats = {
  fieldGuides: 0,
  fieldGuidesStarred: 0,
  questionSets: 0,
  questions: 0,
  literature: 0,
  literatureEnabledForAsk: 0,
};

export async function getUserContentStats(userId: string): Promise<UserContentStats> {
  const db = getDb();

  const [[fieldGuidesRow], [starredRow], [literatureRow], [literatureAskRow], questionRows] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(schema.userFieldGuides)
        .where(eq(schema.userFieldGuides.userId, userId)),
      db
        .select({ count: count() })
        .from(schema.userFieldGuides)
        .where(
          and(eq(schema.userFieldGuides.userId, userId), eq(schema.userFieldGuides.starred, true)),
        ),
      db
        .select({ count: count() })
        .from(schema.userLiteratureMeta)
        .where(eq(schema.userLiteratureMeta.userId, userId)),
      db
        .select({ count: count() })
        .from(schema.userLiteratureMeta)
        .where(
          and(
            eq(schema.userLiteratureMeta.userId, userId),
            eq(schema.userLiteratureMeta.enabledForAsk, true),
          ),
        ),
      db
        .select({ questions: schema.userQuestionSets.questions })
        .from(schema.userQuestionSets)
        .where(eq(schema.userQuestionSets.userId, userId)),
    ]);

  const questions = questionRows.reduce((sum, row) => {
    const list = row.questions as QuestionBankSet["questions"] | null;
    return sum + (Array.isArray(list) ? list.length : 0);
  }, 0);

  return {
    fieldGuides: fieldGuidesRow?.count ?? 0,
    fieldGuidesStarred: starredRow?.count ?? 0,
    questionSets: questionRows.length,
    questions,
    literature: literatureRow?.count ?? 0,
    literatureEnabledForAsk: literatureAskRow?.count ?? 0,
  };
}
