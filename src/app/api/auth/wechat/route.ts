import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** 微信登录占位：后续接入开放平台 OAuth */
export async function GET() {
  return NextResponse.json(
    {
      error: "微信登录即将上线，请先用邮箱注册或登录。",
      status: "coming_soon",
    },
    { status: 501 },
  );
}

export async function POST() {
  return GET();
}
