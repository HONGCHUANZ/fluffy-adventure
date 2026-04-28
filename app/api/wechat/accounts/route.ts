import { NextRequest, NextResponse } from "next/server";
import { getWechatAccountsWithSettings, saveWechatSettings } from "@/lib/wechat-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getWechatAccountsWithSettings();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "读取公众号账号失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const settings = body?.settings;
    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "settings is required" }, { status: 400 });
    }

    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(settings)) {
      normalized[key] = typeof value === "string" ? value : JSON.stringify(value);
    }

    await saveWechatSettings(normalized);
    return NextResponse.json({ message: "OK" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "保存公众号设置失败" }, { status: 500 });
  }
}
