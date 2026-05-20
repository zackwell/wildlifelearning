import { NextResponse } from "next/server";
import { isAuthResponse, requireUser } from "@/lib/auth/require-user";
import { upsertUserFieldGuides } from "@/lib/user-data/field-guides-server";
import { upsertUserQuestionSets } from "@/lib/user-data/question-bank-server";
import { migrateUserLiteratureMetas } from "@/lib/user-data/literature-meta-server";
import type { FieldGuideSavedEntry } from "@/lib/personal-field-guide";
import type { QuestionBankSet } from "@/lib/question-bank";
import type { LiteratureMeta } from "@/lib/rag/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userOrRes = await requireUser();
  if (isAuthResponse(userOrRes)) return userOrRes;

  let body: {
    fieldGuides?: FieldGuideSavedEntry[];
    questionSets?: QuestionBankSet[];
    literatureMetas?: LiteratureMeta[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON。" }, { status: 400 });
  }

  const fieldGuides = Array.isArray(body.fieldGuides) ? body.fieldGuides : [];
  const questionSets = Array.isArray(body.questionSets) ? body.questionSets : [];
  const literatureMetas = Array.isArray(body.literatureMetas) ? body.literatureMetas : [];

  try {
    const fg = await upsertUserFieldGuides(userOrRes.id, fieldGuides);
    const qb = await upsertUserQuestionSets(userOrRes.id, questionSets);
    const lit = await migrateUserLiteratureMetas(userOrRes.id, literatureMetas);
    return NextResponse.json({
      ok: true,
      imported: { fieldGuides: fg, questionSets: qb, literature: lit },
    });
  } catch {
    return NextResponse.json({ error: "迁移失败，请稍后重试。" }, { status: 500 });
  }
}
