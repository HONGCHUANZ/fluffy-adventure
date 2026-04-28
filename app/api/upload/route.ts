import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const IMGBB_API_KEY = process.env.IMGBB_API_KEY || "c83b7ebb5bd0b61cfeb7dd6016effd2a";
const IMGBB_API_URL = "https://api.imgbb.com/1/upload";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File | null;

    if (!image) {
      return NextResponse.json({ error: "没有图片" }, { status: 400 });
    }

    // Convert file to base64
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    // Upload to imgbb
    const imgbbFormData = new FormData();
    imgbbFormData.append("key", IMGBB_API_KEY);
    imgbbFormData.append("image", base64);
    imgbbFormData.append("name", image.name || "upload");

    const response = await fetch(IMGBB_API_URL, {
      method: "POST",
      body: imgbbFormData,
    });

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json({ error: "上传失败" }, { status: 500 });
    }

    return NextResponse.json({
      url: data.data.url,
      thumbnail: data.data.thumb?.url || data.data.medium?.url || data.data.url,
      displayUrl: data.data.display_url || data.data.url,
      filename: image.name,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
