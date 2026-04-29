import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createWechatDraftSyncRecord } from "@/lib/db";
import { syncWechatDraft } from "@/lib/wechat";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    sessionId,
    platform,
    accountId,
    title,
    digest,
    author,
    html,
    coverImageUrl,
  } = body as {
    sessionId?: string;
    platform?: string;
    accountId?: string;
    title?: string;
    digest?: string;
    author?: string;
    html?: string;
    coverImageUrl?: string;
  };

  if (!sessionId || !accountId || !title || !html) {
    return NextResponse.json({ error: "sessionId, accountId, title, and html are required" }, { status: 400 });
  }

  try {
    const result = await syncWechatDraft({
      sessionId,
      platform: platform || "公众号文章",
      accountId,
      title,
      digest: digest || "",
      author: author || "",
      html,
      coverImageUrl,
    });

    return NextResponse.json({
      message: "OK",
      draftMediaId: result.draftMediaId,
      coverMediaId: result.coverMediaId,
    });
  } catch (error: any) {
    await createWechatDraftSyncRecord({
      id: randomUUID(),
      session_id: sessionId,
      platform: platform || "公众号文章",
      account_id: accountId,
      draft_media_id: "",
      title: title || "",
      digest: digest || "",
      cover_media_id: "",
      status: "error",
      error_message: error.message || "同步草稿失败",
      payload_snapshot: JSON.stringify({ title, digest, author, html, coverImageUrl }),
    });

    return NextResponse.json({ error: error.message || "同步草稿失败" }, { status: 500 });
  }
}
