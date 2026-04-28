import { NextResponse } from "next/server";
import { buildWechatBindUrl, createWechatBindState } from "@/lib/wechat-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const redirectTo = typeof body.redirectTo === "string" ? body.redirectTo : "/?tab=factory&view=settings";
    const state = await createWechatBindState(redirectTo);
    const url = buildWechatBindUrl(state);
    return NextResponse.json({ url, state });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "发起公众号绑定失败" }, { status: 500 });
  }
}
