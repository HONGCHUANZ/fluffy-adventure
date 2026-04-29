"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send, Settings, X } from "lucide-react";
import { useStore } from "@/store/useStore";

type WechatAccount = {
  id: string;
  accountName: string;
  authorizerAppId: string;
};

type WechatSettings = {
  defaultAccountId?: string;
  defaultAuthor?: string;
  defaultDigestMode?: string;
  defaultCoverMode?: string;
};

function stripHtml(html: string) {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

function findFirstImageUrl(html: string) {
  const match = html.match(/<img[^>]+src="([^"]+)"/i);
  return match?.[1] || "";
}

function buildFallbackTitle(html: string, fallback = "未命名草稿") {
  const heading = html.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i)?.[1]?.replace(/<[^>]+>/g, "").trim();
  return heading || fallback;
}

export default function WechatSyncModal() {
  const { wechatSyncDraft, setWechatSyncDraft, setFactoryView } = useStore();
  const [accounts, setAccounts] = useState<WechatAccount[]>([]);
  const [settings, setSettings] = useState<WechatSettings>({});
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    accountId: "",
    title: "",
    digest: "",
    author: "",
    coverImageUrl: "",
  });

  useEffect(() => {
    if (!wechatSyncDraft) return;
    setLoadingAccounts(true);
    fetch("/api/wechat/accounts")
      .then((res) => res.json())
      .then((data) => {
        const nextAccounts = data.accounts || [];
        const nextSettings = data.settings || {};
        setAccounts(nextAccounts);
        setSettings(nextSettings);

        const html = wechatSyncDraft.html || "";
        const title = wechatSyncDraft.title || buildFallbackTitle(html, "公众号草稿");
        const plainText = stripHtml(html);
        const digest = wechatSyncDraft.digest || plainText.slice(0, 120);
        const coverImageUrl = wechatSyncDraft.coverImageUrl || findFirstImageUrl(html);
        const accountId = nextSettings.defaultAccountId || nextAccounts[0]?.id || "";
        setForm({
          accountId,
          title,
          digest,
          author: wechatSyncDraft.author || nextSettings.defaultAuthor || "",
          coverImageUrl,
        });
      })
      .catch((err) => setError(err.message || "加载公众号账号失败"))
      .finally(() => setLoadingAccounts(false));
  }, [wechatSyncDraft]);

  const hasAccounts = accounts.length > 0;
  const canSubmit = useMemo(() => {
    return !!wechatSyncDraft && !!form.accountId && !!form.title?.trim();
  }, [form.accountId, form.title, wechatSyncDraft]);

  const close = () => {
    setWechatSyncDraft(null);
    setError(null);
    setSuccess(null);
  };

  const goToSettings = () => {
    close();
    setFactoryView("settings");
  };

  const handleSubmit = async () => {
    if (!wechatSyncDraft) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/wechat/drafts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: wechatSyncDraft.sessionId,
          platform: wechatSyncDraft.platform,
          html: wechatSyncDraft.html,
          accountId: form.accountId,
          title: form.title.trim(),
          digest: form.digest.trim(),
          author: form.author.trim(),
          coverImageUrl: form.coverImageUrl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "同步草稿失败");
      }
      setSuccess(`已同步到草稿箱，草稿 ID：${data.draftMediaId}`);
    } catch (err: any) {
      setError(err.message || "同步草稿失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl shadow-slate-900/10">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h3 className="text-lg font-bold text-gray-800">同步到公众号草稿箱</h3>
            <p className="mt-1 text-xs text-gray-400">补齐标题、摘要和封面后，直接把当前排版结果同步到微信公众号草稿箱。</p>
          </div>
          <button onClick={close} className="rounded-xl p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          {loadingAccounts ? (
            <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> 读取公众号配置中...
            </div>
          ) : !hasAccounts ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
              还没有绑定公众号账号，请先去设置页完成绑定。
              <div className="mt-3">
                <button onClick={goToSettings} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-amber-700 shadow-sm hover:bg-amber-100 transition-all">
                  <Settings className="h-4 w-4" /> 前往设置绑定
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-gray-500">
                  <span>同步账号</span>
                  <select
                    value={form.accountId}
                    onChange={(e) => setForm((prev) => ({ ...prev, accountId: e.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-purple-300"
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>{account.accountName}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-gray-500">
                  <span>作者名</span>
                  <input
                    value={form.author}
                    onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-purple-300"
                    placeholder="可选，默认使用设置页配置"
                  />
                </label>
              </div>

              <label className="block space-y-2 text-sm text-gray-500">
                <span>标题</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-purple-300"
                />
              </label>

              <label className="block space-y-2 text-sm text-gray-500">
                <span>摘要</span>
                <textarea
                  value={form.digest}
                  onChange={(e) => setForm((prev) => ({ ...prev, digest: e.target.value }))}
                  className="h-24 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none resize-none focus:border-purple-300"
                />
              </label>

              <label className="block space-y-2 text-sm text-gray-500">
                <span>封面图 URL</span>
                <input
                  value={form.coverImageUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, coverImageUrl: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-purple-300"
                  placeholder="默认取正文首图，也可以手动覆盖"
                />
              </label>
            </>
          )}

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}
          {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{success}</div>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-5">
          <button onClick={close} className="rounded-2xl px-5 py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            关闭
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving || !hasAccounts}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:shadow-lg hover:shadow-purple-200/50 transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {saving ? "同步中..." : "立即同步到草稿箱"}
          </button>
        </div>
      </div>
    </div>
  );
}
