import { randomUUID } from "crypto";
import { createWechatDraftSyncRecord, saveWechatAccount } from "@/lib/db";
import { getWechatAccountById } from "@/lib/db";
import { getWechatAccountsInfo } from "@/lib/wechat-auth";

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

  let data: any;
  const contentType = response.headers.get("content-type") || "";
  try {
    data = contentType.includes("application/json") ? await response.json() : await response.text();
  } catch {
    const text = await response.text().catch(() => "(无法读取响应体)");
    throw new Error(`微信接口响应解析失败 [${response.status}]: ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    const msg = typeof data === "object" && data?.errmsg ? data.errmsg : typeof data === "string" ? data : `微信接口请求失败 [${response.status}]`;
    throw new Error(msg);
  }
  if (typeof data === "object" && data?.errcode && data.errcode !== 0) {
    throw new Error(data.errmsg || `微信接口返回错误 [${data.errcode}]`);
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
  const blob = new Blob([bytes], { type: file.contentType });
  formData.append(fieldName, blob, file.filename);
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
  const { settings } = await getWechatAccountsInfo();
  const appId = settings.wechatAppId || account.authorizerAppId || "";
  const appSecret = settings.wechatAppSecret || "";
  if (!appId || !appSecret) throw new Error("请先在设置页配置公众号 AppID 和 AppSecret");

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`;
  const response = await fetch(url);
  const data = await response.json() as { access_token?: string; expires_in?: number; errcode?: number; errmsg?: string };

  if (data.errcode) throw new Error(data.errmsg || `刷新 access_token 失败 (${data.errcode})`);
  if (!data.access_token) throw new Error("获取 access_token 失败");

  const nextExpiresAt = Date.now() + (data.expires_in || 7200) * 1000;
  await saveWechatAccount({
    id: account.id,
    account_name: account.accountName,
    authorizer_appid: account.authorizerAppId,
    principal_name: "",
    avatar_url: "",
    access_token: data.access_token,
    refresh_token: account.refreshToken,
    expires_at: nextExpiresAt,
  });

  return data.access_token;
}

export async function uploadImageToWechat(account: WechatAccountInfo, imageUrl: string) {
  const token = await getAccessToken(account);
  const file = await fetchRemoteFile(imageUrl);
  const body = buildMultipartForm("media", file);
  return wechatApiRequest<{ url: string }>({ accessToken: token, path: "/cgi-bin/media/uploadimg", body });
}

export async function uploadPermanentThumb(account: WechatAccountInfo, imageUrl: string): Promise<{ media_id: string }> {
  const token = await getAccessToken(account);
  const file = await fetchRemoteFile(imageUrl);
  const body = buildMultipartForm("media", file);
  const result = await wechatApiRequest<{ media_id?: string }>({ accessToken: token, path: "/cgi-bin/material/add_material?type=thumb", body });
  if (!result.media_id) throw new Error("封面上传成功但未返回 media_id，请尝试更换封面图");
  return { media_id: result.media_id };
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
  coverImageUrl?: string;
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

  let thumbMediaId = "";
  if (input.coverImageUrl?.trim()) {
    try {
      const thumb = await uploadPermanentThumb(account, input.coverImageUrl.trim());
      thumbMediaId = thumb.media_id;
    } catch (err: any) {
      // 如果封面上传失败，尝试不传封面继续（thumb_media_id 为空）
      console.warn(`封面上传失败，将使用空封面创建草稿: ${err.message}`);
    }
  }

  const draft = await createWechatDraft(account, {
    title: input.title,
    author: input.author,
    digest: input.digest,
    content: normalizedHtml,
    thumbMediaId,
  });

  await createWechatDraftSyncRecord({
    id: randomUUID(),
    session_id: input.sessionId,
    platform: input.platform,
    account_id: input.accountId,
    draft_media_id: draft.media_id,
    title: input.title,
    digest: input.digest,
    cover_media_id: thumbMediaId,
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

  return { draftMediaId: draft.media_id, coverMediaId: thumbMediaId };
}
