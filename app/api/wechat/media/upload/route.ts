import { NextRequest, NextResponse } from "next/server";
import { uploadImageToWechat } from "@/lib/wechat";
import { getWechatAccountsInfo } from "@/lib/wechat-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, imageUrl } = body as { accountId?: string; imageUrl?: string };

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const { accounts, settings } = await getWechatAccountsInfo();
    let targetAccount = accounts.find((a) => a.id === accountId);
    if (!targetAccount && settings.defaultAccountId) {
      targetAccount = accounts.find((a) => a.id === settings.defaultAccountId);
    }
    if (!targetAccount) {
      if (accounts.length === 1) {
        targetAccount = accounts[0];
      } else {
        return NextResponse.json({ error: "公众号账号不存在，请先在设置页配置" }, { status: 400 });
      }
    }

    const result = await uploadImageToWechat(targetAccount, imageUrl);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "上传微信素材失败" }, { status: 500 });
  }
}
