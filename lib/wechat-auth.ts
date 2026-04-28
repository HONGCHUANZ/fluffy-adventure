import { randomUUID } from "crypto";
import {
  createWechatOAuthState,
  consumeWechatOAuthState,
  getAllWechatIntegrationSettings,
  getWechatAccountByAuthorizerAppId,
  getWechatAccountById,
  getWechatAccounts,
  saveWechatAccount,
  saveWechatIntegrationSetting,
} from "@/lib/db";

const WECHAT_COMPONENT_APP_ID = process.env.WECHAT_COMPONENT_APP_ID || "";
const WECHAT_COMPONENT_APP_SECRET = process.env.WECHAT_COMPONENT_APP_SECRET || "";
const WECHAT_COMPONENT_ACCESS_TOKEN = process.env.WECHAT_COMPONENT_ACCESS_TOKEN || "";
const WECHAT_COMPONENT_REDIRECT_URI = process.env.WECHAT_COMPONENT_REDIRECT_URI || "";
const WECHAT_MOCK_AUTHORIZER_APPID = process.env.WECHAT_MOCK_AUTHORIZER_APPID || "mock-authorizer-appid";
const WECHAT_MOCK_ACCOUNT_NAME = process.env.WECHAT_MOCK_ACCOUNT_NAME || "未命名公众号";

const WECHAT_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const WECHAT_ACCESS_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export type WechatAccount = {
  id: string;
  accountName: string;
  authorizerAppId: string;
  principalName: string;
  avatarUrl: string;
  serviceType: number;
  verifyType: number;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  rawProfile: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};

function requireWechatComponentConfig() {
  if (!WECHAT_COMPONENT_APP_ID || !WECHAT_COMPONENT_APP_SECRET || !WECHAT_COMPONENT_REDIRECT_URI) {
    throw new Error("缺少微信公众号开放平台配置，请设置 WECHAT_COMPONENT_APP_ID / WECHAT_COMPONENT_APP_SECRET / WECHAT_COMPONENT_REDIRECT_URI");
  }
}

function toWechatAccount(record: any): WechatAccount {
  return {
    id: record.id,
    accountName: record.account_name,
    authorizerAppId: record.authorizer_appid,
    principalName: record.principal_name,
    avatarUrl: record.avatar_url,
    serviceType: Number(record.service_type || 0),
    verifyType: Number(record.verify_type || 0),
    accessToken: record.access_token,
    refreshToken: record.refresh_token,
    expiresAt: Number(record.expires_at || 0),
    rawProfile: JSON.parse(record.raw_profile || "{}"),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

async function exchangeAuthorizationCode(authorizationCode: string) {
  if (!WECHAT_COMPONENT_ACCESS_TOKEN) {
    return {
      authorizer_appid: WECHAT_MOCK_AUTHORIZER_APPID,
      authorizer_access_token: `mock-access-token-${authorizationCode}`,
      authorizer_refresh_token: `mock-refresh-token-${authorizationCode}`,
      expires_in: 7200,
    };
  }

  const response = await fetch(`https://api.weixin.qq.com/cgi-bin/component/api_query_auth?access_token=${encodeURIComponent(WECHAT_COMPONENT_ACCESS_TOKEN)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      component_appid: WECHAT_COMPONENT_APP_ID,
      authorization_code: authorizationCode,
    }),
  });

  const data = await response.json();
  if (!response.ok || data.errcode) {
    throw new Error(data.errmsg || "获取公众号授权信息失败");
  }

  return data.authorization_info;
}

async function fetchAuthorizerInfo(authorizerAppId: string) {
  if (!WECHAT_COMPONENT_ACCESS_TOKEN) {
    return {
      user_name: WECHAT_MOCK_ACCOUNT_NAME,
      principal_name: "Mock Principal",
      alias: "mock-account",
      head_img: "",
      service_type_info: { id: 2 },
      verify_type_info: { id: 0 },
    };
  }

  const response = await fetch(`https://api.weixin.qq.com/cgi-bin/component/api_get_authorizer_info?access_token=${encodeURIComponent(WECHAT_COMPONENT_ACCESS_TOKEN)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      component_appid: WECHAT_COMPONENT_APP_ID,
      authorizer_appid: authorizerAppId,
    }),
  });

  const data = await response.json();
  if (!response.ok || data.errcode) {
    throw new Error(data.errmsg || "获取公众号资料失败");
  }

  return data.authorizer_info || {};
}

async function refreshAuthorizerToken(account: WechatAccount) {
  if (!WECHAT_COMPONENT_ACCESS_TOKEN) {
    const expiresAt = Date.now() + 7200 * 1000;
    const next = {
      ...account,
      accessToken: `mock-access-token-refreshed-${account.authorizerAppId}`,
      expiresAt,
    };
    await persistWechatAccount(next);
    return next;
  }

  const response = await fetch(`https://api.weixin.qq.com/cgi-bin/component/api_authorizer_token?access_token=${encodeURIComponent(WECHAT_COMPONENT_ACCESS_TOKEN)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      component_appid: WECHAT_COMPONENT_APP_ID,
      authorizer_appid: account.authorizerAppId,
      authorizer_refresh_token: account.refreshToken,
    }),
  });

  const data = await response.json();
  if (!response.ok || data.errcode) {
    throw new Error(data.errmsg || "刷新公众号 access token 失败");
  }

  const next = {
    ...account,
    accessToken: data.authorizer_access_token,
    refreshToken: data.authorizer_refresh_token || account.refreshToken,
    expiresAt: Date.now() + Number(data.expires_in || 7200) * 1000,
  };
  await persistWechatAccount(next);
  return next;
}

export async function persistWechatAccount(account: WechatAccount) {
  await saveWechatAccount({
    id: account.id,
    account_name: account.accountName,
    authorizer_appid: account.authorizerAppId,
    principal_name: account.principalName,
    avatar_url: account.avatarUrl,
    service_type: account.serviceType,
    verify_type: account.verifyType,
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expires_at: account.expiresAt,
    raw_profile: JSON.stringify(account.rawProfile || {}),
  });
}

export async function createWechatBindState(redirectTo = "/?tab=factory&view=settings") {
  requireWechatComponentConfig();
  const state = randomUUID();
  await createWechatOAuthState({
    state,
    redirect_to: redirectTo,
    expires_at: Date.now() + WECHAT_OAUTH_STATE_TTL_MS,
  });
  return state;
}

export function buildWechatBindUrl(state: string) {
  requireWechatComponentConfig();
  const callback = encodeURIComponent(WECHAT_COMPONENT_REDIRECT_URI);
  return `https://mp.weixin.qq.com/cgi-bin/componentloginpage?component_appid=${encodeURIComponent(WECHAT_COMPONENT_APP_ID)}&redirect_uri=${callback}&auth_type=3&state=${encodeURIComponent(state)}`;
}

export async function completeWechatBind(authorizationCode: string, state: string) {
  requireWechatComponentConfig();
  if (!authorizationCode) {
    throw new Error("缺少授权码");
  }

  const stateRecord = await consumeWechatOAuthState(state);
  if (!stateRecord) {
    throw new Error("绑定状态不存在或已失效");
  }
  if (stateRecord.used_at) {
    throw new Error("绑定状态已被使用，请重新发起绑定");
  }
  if (Number(stateRecord.expires_at || 0) < Date.now()) {
    throw new Error("绑定状态已过期，请重新发起绑定");
  }

  const authInfo = await exchangeAuthorizationCode(authorizationCode);
  const authorizerInfo = await fetchAuthorizerInfo(authInfo.authorizer_appid);
  const existing = await getWechatAccountByAuthorizerAppId(authInfo.authorizer_appid);
  const account: WechatAccount = {
    id: existing?.id || randomUUID(),
    accountName: authorizerInfo.user_name || authorizerInfo.nick_name || WECHAT_MOCK_ACCOUNT_NAME,
    authorizerAppId: authInfo.authorizer_appid,
    principalName: authorizerInfo.principal_name || "",
    avatarUrl: authorizerInfo.head_img || "",
    serviceType: Number(authorizerInfo.service_type_info?.id || 0),
    verifyType: Number(authorizerInfo.verify_type_info?.id || 0),
    accessToken: authInfo.authorizer_access_token,
    refreshToken: authInfo.authorizer_refresh_token,
    expiresAt: Date.now() + Number(authInfo.expires_in || 7200) * 1000,
    rawProfile: authorizerInfo,
  };

  await persistWechatAccount(account);

  const settings = await getAllWechatIntegrationSettings();
  if (!settings.defaultAccountId) {
    await saveWechatIntegrationSetting("defaultAccountId", account.id);
  }

  return {
    account,
    redirectTo: stateRecord.redirect_to || "/?tab=factory&view=settings",
  };
}

export async function getWechatAccountsWithSettings() {
  const [accounts, settings] = await Promise.all([
    getWechatAccounts(),
    getAllWechatIntegrationSettings(),
  ]);

  return {
    accounts: accounts.map(toWechatAccount),
    settings,
  };
}

export async function getWechatAccountOrThrow(id: string) {
  const record = await getWechatAccountById(id);
  if (!record) {
    throw new Error("公众号账号不存在，请先完成绑定");
  }
  return toWechatAccount(record);
}

export async function refreshWechatAccessTokenIfNeeded(accountId: string) {
  const account = await getWechatAccountOrThrow(accountId);
  if (account.expiresAt > Date.now() + WECHAT_ACCESS_TOKEN_REFRESH_BUFFER_MS) {
    return account;
  }
  return refreshAuthorizerToken(account);
}

export async function saveWechatSettings(settings: Record<string, string>) {
  await Promise.all(
    Object.entries(settings).map(([key, value]) => saveWechatIntegrationSetting(key, value))
  );
}
