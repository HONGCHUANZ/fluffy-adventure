import { randomUUID } from "crypto";
import { createWechatDraftSyncRecord } from "@/lib/db";
import { refreshWechatAccessTokenIfNeeded } from "@/lib/wechat-auth";

const WECHAT_MOCK_MODE = !process.env.WECHAT_COMPONENT_ACCESS_TOKEN;

type WechatRequestOptions = {
  method?: "GET" | "POST";
  accessToken: string;
  path: string;
  body?: BodyInit | null;
  headers?: Record<string, string>;
};

export type WechatDraftSyncInput = {
  sessionId: string;
  platform: string;
  accountId: string;
  title: string;
  digest: string;
  author: string;
  html: string;
  coverImageUrl: string;
};

function stripUnsupportedAttributes(html: string) {
  return html
    .replace(/\b(?:data-[\w-]+|contenteditable|draggable|spellcheck|aria-[\w-]+)="[^"]*"/g, "")
    .replace(/\bclass="[^"]*"/g, "")
    .replace(/\bstyle="\s*"/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractImageUrls(html: string) {
  const matches = Array.from(html.matchAll(/<img[^>]+src="([^"]+)"/gi));
  return matches.map((match) => match[1]).filter(Boolean);
}

async function wechatRequest<T = any>({ method = "POST", accessToken, path, body, headers }: WechatRequestOptions): Promise<T> {
  if (WECHAT_MOCK_MODE) {
    return {} as T;
  }

  const response = await fetch(`https://api.weixin.qq.com${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(accessToken)}`, {
    method,
    headers,
    body,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(typeof data === "string" ? data : data?.errmsg || "微信接口请求失败");
  }
  if (typeof data === "object" && data?.errcode) {
    throw new Error(data.errmsg || "微信接口返回错误");
  }
  return data as T;
}

async function fetchRemoteFile(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载图片失败: ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
    filename: `wechat-${randomUUID()}.${extension}`,
  };
}

function buildMultipartForm(fieldName: string, file: { buffer: Buffer; filename: string; contentType: string }) {
  const formData = new FormData();
  const bytes = new Uint8Array(file.buffer);
  formData.append(fieldName, new Blob([bytes], { type: file.contentType }), file.filename);
  return formData;
}

export async function uploadImageToWechat(accountId: string, imageUrl: string) {
  const account = await refreshWechatAccessTokenIfNeeded(accountId);
  if (WECHAT_MOCK_MODE) {
    return {
      url: `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}wechat=1`,
    };
  }

  const file = await fetchRemoteFile(imageUrl);
  const body = buildMultipartForm("media", file);
  return wechatRequest<{ url: string }>({
    accessToken: account.accessToken,
    path: "/cgi-bin/media/uploadimg",
    body,
  });
}

export async function uploadPermanentThumb(accountId: string, imageUrl: string) {
  const account = await refreshWechatAccessTokenIfNeeded(accountId);
  if (WECHAT_MOCK_MODE) {
    return { media_id: `mock-thumb-${randomUUID()}` };
  }

  const file = await fetchRemoteFile(imageUrl);
  const body = buildMultipartForm("media", file);
  return wechatRequest<{ media_id: string }>({
    accessToken: account.accessToken,
    path: "/cgi-bin/material/add_material?type=thumb",
    body,
  });
}

export async function normalizeHtmlForWechatDraft(accountId: string, html: string) {
  let normalized = stripUnsupportedAttributes(html);
  const urls = Array.from(new Set(extractImageUrls(normalized)));

  for (const url of urls) {
    const uploaded = await uploadImageToWechat(accountId, url);
    normalized = normalized.split(url).join(uploaded.url);
  }

  return normalized;
}

export async function createWechatDraft(accountId: string, payload: {
  title: string;
  author: string;
  digest: string;
  content: string;
  thumbMediaId: string;
}) {
  const account = await refreshWechatAccessTokenIfNeeded(accountId);
  if (WECHAT_MOCK_MODE) {
    return { media_id: `mock-draft-${randomUUID()}` };
  }

  return wechatRequest<{ media_id: string }>({
    accessToken: account.accessToken,
    path: "/cgi-bin/draft/add",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      articles: [
        {
          title: payload.title,
          author: payload.author,
          digest: payload.digest,
          content: payload.content,
          thumb_media_id: payload.thumbMediaId,
          need_open_comment: 0,
          only_fans_can_comment: 0,
        },
      ],
    }),
  });
}

export async function syncWechatDraft(input: WechatDraftSyncInput) {
  const normalizedHtml = await normalizeHtmlForWechatDraft(input.accountId, input.html);
  const thumb = await uploadPermanentThumb(input.accountId, input.coverImageUrl);
  const created = await createWechatDraft(input.accountId, {
    title: input.title,
    author: input.author,
    digest: input.digest,
    content: normalizedHtml,
    thumbMediaId: thumb.media_id,
  });

  const payloadSnapshot = {
    title: input.title,
    digest: input.digest,
    author: input.author,
    html: normalizedHtml,
    coverImageUrl: input.coverImageUrl,
  };

  await createWechatDraftSyncRecord({
    id: randomUUID(),
    session_id: input.sessionId,
    platform: input.platform,
    account_id: input.accountId,
    draft_media_id: created.media_id,
    title: input.title,
    digest: input.digest,
    cover_media_id: thumb.media_id,
    status: "success",
    error_message: "",
    payload_snapshot: JSON.stringify(payloadSnapshot),
  });

  return {
    draftMediaId: created.media_id,
    coverMediaId: thumb.media_id,
    content: normalizedHtml,
  };
}
