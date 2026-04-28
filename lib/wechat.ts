import { randomUUID } from "crypto";
import { createWechatDraftSyncRecord } from "@/lib/db";
import { getWechatAccountById } from "@/lib/db";

const ACCESS_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

type WechatRequestOptions = {
  method?: "GET" | "POST";
  accessToken: string;
  path: string;
  body?: BodyInit | null;
  headers?: Record<string, string>;
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
  return matches.map((m) => m[1]).filter(Boolean);
}

async function wechatApiRequest<T = any>({
  method = "POST",
  accessToken,
  path,
  body,
  headers,
}: WechatRequestOptions): Promise<T> {
  const url = `https://api.weixin.qq.com${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url, { method, headers, body });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(typeof data === "string" ? data : (data as any)?.errmsg || "微信接口请求失败");
  }
  if (typeof data === "object" && (data as any)?.errcode) {
    throw new Error((data as any).errmsg || "微信接口返回错误");
  }
  return data as T;
}

async function fetchRemoteFile(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`下载图片失败: ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  return { buffer: Buffer.from(arrayBuffer), contentType, filename: `wechat-${randomUUID()}.${ext}` };
}

function buildMultipartForm(fieldName: string, file: { buffer: Buffer; filename: string; contentType: string }) {
  const formData = new FormData();
  const bytes = new Uint8Array(file.buffer);
  formData.append(fieldName, new Blob([bytes], { type: file.contentType }), file.filename);
  return formData;
}

export type WechatAccountInfo = {
  id: string;
  accountName: string;
  authorizerAppId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export async function getAccessToken(account: WechatAccountInfo): Promise<string> {
  if (account.expiresAt > Date.now() + ACCESS_TOKEN_REFRESH_BUFFER_MS) {
    return account.accessToken;
  }
  return await refreshAccessToken(account);
}

async function refreshAccessToken(account: WechatAccountInfo): Promise<string> {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;
  if (!appId || !appSecret) throw new Error("请先在设置页配置公众号 AppID 和 AppSecret");

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`;
  const response = await fetch(url);
  const data = await response.json() as { access_token?: string; expires_in?: number; errcode?: number; errmsg?: string };

  if (data.errcode) throw new Error(data.errmsg || `刷新 access_token 失败 (${data.errcode})`);
  if (!data.access_token) throw new Error("获取 access_token 失败");

  return data.access_token;
}

export async function uploadImageToWechat(account: WechatAccountInfo, imageUrl: string) {
  const token = await getAccessToken(account);
  const file = await fetchRemoteFile(imageUrl);
  const body = buildMultipartForm("media", file);
  return wechatApiRequest<{ url: string }>({ accessToken: token, path: "/cgi-bin/media/uploadimg", body });
}

export async function uploadPermanentThumb(account: WechatAccountInfo, imageUrl: string) {
  const token = await getAccessToken(account);
  const file = await fetchRemoteFile(imageUrl);
  const body = buildMultipartForm("media", file);
  return wechatApiRequest<{ media_id: string }>({ accessToken: token, path: "/cgi-bin/material/add_material?type=thumb", body });
}

export async function normalizeHtmlForWechatDraft(account: WechatAccountInfo, html: string) {
  let normalized = stripUnsupportedAttributes(html);
  const urls = Array.from(new Set(extractImageUrls(normalized)));

  for (const url of urls) {
    try {
      const uploaded = await uploadImageToWechat(account, url);
      normalized = normalized.split(url).join(uploaded.url);
    } catch {
      // 如果图片上传失败，保留原 URL
    }
  }
  return normalized;
}

export async function createWechatDraft(account: WechatAccountInfo, payload: {
  title: string;
  author: string;
  digest: string;
  content: string;
  thumbMediaId: string;
}) {
  const token = await getAccessToken(account);
  return wechatApiRequest<{ media_id: string }>({
    accessToken: token,
    path: "/cgi-bin/draft/add",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      articles: [{
        title: payload.title,
        author: payload.author,
        digest: payload.digest,
        content: payload.content,
        thumb_media_id: payload.thumbMediaId,
        need_open_comment: 0,
        only_fans_can_comment: 0,
      }],
    }),
  });
}

export async function syncWechatDraft(input: {
  accountId: string;
  sessionId: string;
  platform: string;
  title: string;
  digest: string;
  author: string;
  html: string;
  coverImageUrl: string;
}) {
  const record = await getWechatAccountById(input.accountId);
  if (!record) throw new Error("公众号账号不存在，请先在设置页配置");

  const account: WechatAccountInfo = {
    id: record.id,
    accountName: record.account_name,
    authorizerAppId: record.authorizer_appid,
    accessToken: record.access_token,
    refreshToken: record.refresh_token,
    expiresAt: Number(record.expires_at || 0),
  };

  const normalizedHtml = await normalizeHtmlForWechatDraft(account, input.html);
  const thumb = await uploadPermanentThumb(account, input.coverImageUrl);
  const draft = await createWechatDraft(account, {
    title: input.title,
    author: input.author,
    digest: input.digest,
    content: normalizedHtml,
    thumbMediaId: thumb.media_id,
  });

  await createWechatDraftSyncRecord({
    id: randomUUID(),
    session_id: input.sessionId,
    platform: input.platform,
    account_id: input.accountId,
    draft_media_id: draft.media_id,
    title: input.title,
    digest: input.digest,
    cover_media_id: thumb.media_id,
    status: "success",
    error_message: "",
    payload_snapshot: JSON.stringify({
      title: input.title,
      digest: input.digest,
      author: input.author,
      html: normalizedHtml,
      coverImageUrl: input.coverImageUrl,
    }),
  });

  return { draftMediaId: draft.media_id, coverMediaId: thumb.media_id };
}
