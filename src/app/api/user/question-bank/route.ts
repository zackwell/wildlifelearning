import { NextResponse } from "next/server";
import { isAuthResponse, requireUser } from "@/lib/auth/require-user";
import {
  insertUserQuestionSet,
  listUserQuestionSets,
} from "@/lib/user-data/question-bank-server";
import type { QuestionBankSet } from "@/lib/question-bank";

export const runtime = "nodejs";

export async function GET() {
  const userOrRes = await requireUser();
  if (isAuthResponse(userOrRes)) return userOrRes;
  const sets = await listUserQuestionSets(userOrRes.id);
  return NextResponse.json({ sets });
}

export async function POST(req: Request) {
  const userOrRes = await requireUser();
  if (isAuthResponse(userOrRes)) return userOrRes;
  let body: { set?: QuestionBankSet };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON。" }, { status: 400 });
  }
  if (!body.set?.questions?.length) {
    return NextResponse.json({ error: "题目为空。" }, { status: 400 });
  }
  try {
    await insertUserQuestionSet(userOrRes.id, body.set);
    return NextResponse.json({ set: body.set });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "保存失败";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
