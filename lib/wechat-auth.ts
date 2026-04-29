import { randomUUID } from "crypto";
import {
  getWechatAccountById,
  getWechatAccounts,
  saveWechatAccount,
  getAllWechatIntegrationSettings,
  saveWechatIntegrationSetting,
} from "@/lib/db";

const ACCESS_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export type WechatAccountInfo = {
  id: string;
  accountName: string;
  authorizerAppId: string;
  principalName: string;
  avatarUrl: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

function toAccount(record: any): WechatAccountInfo {
  return {
    id: record.id,
    accountName: record.account_name,
    authorizerAppId: record.authorizer_appid,
    principalName: record.principal_name,
    avatarUrl: record.avatar_url,
    accessToken: record.access_token,
    refreshToken: record.refresh_token,
    expiresAt: Number(record.expires_at || 0),
  };
}

async function getStoredWechatCredentials() {
  const settings = await getAllWechatIntegrationSettings();
  const appId = settings.wechatAppId || process.env.WECHAT_APP_ID || "";
  const appSecret = settings.wechatAppSecret || process.env.WECHAT_APP_SECRET || "";
  return { appId, appSecret, settings };
}

export async function saveWechatAccountInfo(account: WechatAccountInfo) {
  await saveWechatAccount({
    id: account.id,
    account_name: account.accountName,
    authorizer_appid: account.authorizerAppId,
    principal_name: account.principalName,
    avatar_url: account.avatarUrl,
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expires_at: account.expiresAt,
  });
}

export async function saveWechatSettings(settings: Record<string, string>) {
  await Promise.all(
    Object.entries(settings).map(([k, v]) => saveWechatIntegrationSetting(k, v))
  );
}

export async function getWechatAccountsInfo() {
  const [accounts, settings] = await Promise.all([
    getWechatAccounts(),
    getAllWechatIntegrationSettings(),
  ]);
  return {
    accounts: accounts.map(toAccount),
    settings,
  };
}

export async function getWechatAccountOrThrow(id: string) {
  const record = await getWechatAccountById(id);
  if (!record) throw new Error("公众号账号不存在，请先在设置页配置");
  return toAccount(record);
}

export async function getAccessToken(accountId: string) {
  const account = await getWechatAccountOrThrow(accountId);
  if (account.expiresAt > Date.now() + ACCESS_TOKEN_REFRESH_BUFFER_MS) {
    return account.accessToken;
  }
  return await refreshAccessToken(accountId);
}

export async function refreshAccessToken(accountId: string): Promise<string> {
  const { appId, appSecret } = await getStoredWechatCredentials();

  if (!appId || !appSecret) {
    throw new Error("请先在设置页配置公众号 AppID 和 AppSecret");
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`;
  const response = await fetch(url);
  const data = await response.json() as { access_token?: string; expires_in?: number; errcode?: number; errmsg?: string };

  if (data.errcode) throw new Error(data.errmsg || `刷新 access_token 失败 (${data.errcode})`);
  if (!data.access_token) throw new Error("获取 access_token 失败");

  const account = await getWechatAccountOrThrow(accountId);
  const next = {
    ...account,
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 7200) * 1000,
  };
  await saveWechatAccountInfo(next);
  return data.access_token;
}

export async function verifyAndSaveWechatCredentials(input?: { appId?: string; appSecret?: string }): Promise<WechatAccountInfo> {
  const appId = input?.appId?.trim() || "";
  const appSecret = input?.appSecret?.trim() || "";

  if (!appId || !appSecret) {
    throw new Error("请先配置公众号 AppID 和 AppSecret");
  }

  await saveWechatSettings({
    wechatAppId: appId,
    wechatAppSecret: appSecret,
  });

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`;
  const response = await fetch(url);
  const data = await response.json() as { access_token?: string; expires_in?: number; errcode?: number; errmsg?: string };

  if (data.errcode) throw new Error(data.errmsg || `AppID 或 AppSecret 无效 (${data.errcode})`);
  if (!data.access_token) throw new Error("获取 access_token 失败");

  const infoUrl = `https://api.weixin.qq.com/cgi-bin/get_current_selfmenu_info?access_token=${encodeURIComponent(data.access_token)}`;
  const infoResponse = await fetch(infoUrl);
  const infoData = await infoResponse.json() as { errcode?: number; nickname?: string; head_img?: string };

  const existing = (await getWechatAccounts()).find((a: any) => a.authorizer_appid === appId);
  const account: WechatAccountInfo = {
    id: existing?.id || randomUUID(),
    accountName: (infoData as any).nickname || appId,
    authorizerAppId: appId,
    principalName: "",
    avatarUrl: (infoData as any).head_img || "",
    accessToken: data.access_token,
    refreshToken: "",
    expiresAt: Date.now() + (data.expires_in || 7200) * 1000,
  };

  await saveWechatAccountInfo(account);

  const { settings } = await getStoredWechatCredentials();
  if (!settings.defaultAccountId) {
    await saveWechatIntegrationSetting("defaultAccountId", account.id);
  }

  return account;
}
