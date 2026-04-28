import { NextRequest, NextResponse } from "next/server";
import { getWechatAccountsInfo, verifyAndSaveWechatCredentials, saveWechatSettings } from "@/lib/wechat-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getWechatAccountsInfo();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "读取公众号账号失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const settings = body?.settings;
    if (settings && typeof settings === "object") {
      const normalized: Record<string, string> = {};
      for (const [key, value] of Object.entries(settings)) {
        normalized[key] = typeof value === "string" ? value : JSON.stringify(value);
      }
      await saveWechatSettings(normalized);
    }
    return NextResponse.json({ message: "OK" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "保存设置失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const account = await verifyAndSaveWechatCredentials();
    return NextResponse.json({ message: "OK", account: { id: account.id, accountName: account.accountName } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "验证公众号凭证失败" }, { status: 500 });
  }
}
