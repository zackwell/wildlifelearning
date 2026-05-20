import { NextResponse } from "next/server";
import { isAuthResponse, requireUser } from "@/lib/auth/require-user";
import { deleteUserQuestionSet } from "@/lib/user-data/question-bank-server";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, props: Props) {
  const userOrRes = await requireUser();
  if (isAuthResponse(userOrRes)) return userOrRes;
  const { id } = await props.params;
  const ok = await deleteUserQuestionSet(userOrRes.id, id);
  if (!ok) {
    return NextResponse.json({ error: "未找到该题组。" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
