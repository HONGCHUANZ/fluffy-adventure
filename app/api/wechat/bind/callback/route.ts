import { NextResponse } from "next/server";
import { completeWechatBind } from "@/lib/wechat-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const authorizationCode = searchParams.get("auth_code") || searchParams.get("authorization_code") || "";
  const state = searchParams.get("state") || "";

  try {
    const result = await completeWechatBind(authorizationCode, state);
    const redirectUrl = new URL(result.redirectTo || "/", request.url);
    redirectUrl.searchParams.set("wechat_bind", "success");
    redirectUrl.searchParams.set("wechat_account", result.account.accountName);
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("wechat_bind", "error");
    redirectUrl.searchParams.set("message", error.message || "公众号绑定失败");
    return NextResponse.redirect(redirectUrl);
  }
}
