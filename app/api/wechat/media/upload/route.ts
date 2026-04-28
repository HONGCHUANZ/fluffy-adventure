import { NextRequest, NextResponse } from "next/server";
import { uploadImageToWechat } from "@/lib/wechat";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, imageUrl } = body as { accountId?: string; imageUrl?: string };

    if (!accountId || !imageUrl) {
      return NextResponse.json({ error: "accountId and imageUrl are required" }, { status: 400 });
    }

    const result = await uploadImageToWechat(accountId, imageUrl);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "上传微信素材失败" }, { status: 500 });
  }
}
