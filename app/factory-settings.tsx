// app/factory-settings.tsx

"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { Save, RotateCcw, ArrowLeft, Check, Link2, Loader2 } from "lucide-react";

const PLATFORMS = ["公众号文章", "小红书笔记", "Twitter 推文", "视频脚本"];
const PLATFORM_ICONS: Record<string, string> = {
  "公众号文章": "📝",
  "小红书笔记": "📕",
  "Twitter 推文": "🐦",
  "视频脚本": "🎬",
};

const DEFAULTS: Record<string, string> = {
  '公众号文章': `你是资深公众号作者，擅长写深度技术文章。
要求：
- 文章长度 2000-3000 字
- 使用小标题分段，每段 3-5 个要点
- 语言风格专业但不枯燥
- 开头要有吸引人的引子，结尾要有总结和行动号召`,
  '小红书笔记': `你是小红书爆款创作者，擅长写种草笔记。
要求：
- 标题 15 字以内，带 emoji
- 正文 200-500 字，简洁有节奏
- 每段不超过 3 行
- 结尾加 3-5 个相关标签（#开头）
- 多用 emoji 增加视觉吸引力`,
  'Twitter 推文': `你是Twitter科技博主，擅长写高互动推文。
要求：
- 单条不超过 280 字符
- 开头要有钩子吸引注意
- 中间要有干货/观点
- 结尾要有互动问题或CTA
- 语言简洁有力，直击重点`,
  '视频脚本': `你是短视频脚本策划师，擅长写口播脚本。
要求：
- 时长 1-3 分钟
- 分镜头标注，含画面和台词
- 开头 3 秒必须有钩子
- 语言口语化，适合朗读
- 结尾要有互动引导`,
};

export default function FactorySettings() {
  const { setFactoryView } = useStore();
  const [prompts, setPrompts] = useState<{ [platform: string]: string }>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [wechatAccounts, setWechatAccounts] = useState<Array<{ id: string; accountName: string; principalName: string }>>([]);
  const [wechatSettings, setWechatSettings] = useState<Record<string, string>>({});
  const [wechatLoading, setWechatLoading] = useState(false);
  const [wechatSaving, setWechatSaving] = useState(false);
  const [bindMessage, setBindMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/factory/prompts")
      .then((res) => res.json())
      .then((data) => setPrompts(data.prompts || {}));
  }, []);

  useEffect(() => {
    setWechatLoading(true);
    fetch("/api/wechat/accounts")
      .then((res) => res.json())
      .then((data) => {
        setWechatAccounts(data.accounts || []);
        setWechatSettings(data.settings || {});

        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const bindResult = params.get("wechat_bind");
          const accountName = params.get("wechat_account");
          const message = params.get("message");
          if (bindResult === "success" && accountName) {
            setBindMessage({ type: "success", text: `公众号 "${accountName}" 绑定成功！` });
          } else if (bindResult === "error") {
            setBindMessage({ type: "error", text: `绑定失败：${decodeURIComponent(message || "未知错误")}` });
          }
          if (bindResult) {
            const url = new URL(window.location.href);
            url.searchParams.delete("wechat_bind");
            url.searchParams.delete("wechat_account");
            url.searchParams.delete("message");
            window.history.replaceState({}, "", url.toString());
          }
        }
      })
      .finally(() => setWechatLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    for (const [platform, prompt] of Object.entries(prompts)) {
      await fetch("/api/factory/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, prompt }),
      });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = async () => {
    for (const platform of PLATFORMS) {
      await fetch("/api/factory/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, prompt: DEFAULTS[platform] || "" }),
      });
    }
    setPrompts({
      '公众号文章': DEFAULTS['公众号文章'],
      '小红书笔记': DEFAULTS['小红书笔记'],
      'Twitter 推文': DEFAULTS['Twitter 推文'],
      '视频脚本': DEFAULTS['视频脚本'],
    });
  };

  const handleBindWechat = async () => {
    const res = await fetch("/api/wechat/bind/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redirectTo: "/?tab=factory&view=settings" }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  };

  const handleSaveWechatSettings = async () => {
    setWechatSaving(true);
    await fetch("/api/wechat/accounts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: wechatSettings }),
    });
    setWechatSaving(false);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-purple-50/50 to-white">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 bg-white/80 backdrop-blur-sm border-b border-purple-100/50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setFactoryView("input")}
            className="p-2 rounded-xl text-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">提示词设置</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-xl text-sm text-gray-400 hover:text-purple-600 hover:bg-purple-50 hover:shadow-sm transition-all font-medium"
          >
            <RotateCcw className="w-4 h-4" /> 重置
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl text-sm font-semibold text-white hover:shadow-lg hover:shadow-purple-200/50 transition-all disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? "已保存 ✓" : "保存设置"}
          </button>
        </div>
      </div>

      {/* Prompt editors */}
      <div className="flex-1 overflow-auto p-8 space-y-8 max-w-4xl">
        <div className="bg-white rounded-2xl p-7 shadow-sm border border-purple-50 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-purple-500" /> 公众号草稿箱同步
              </h3>
              <p className="text-xs text-gray-400 mt-2">在这里绑定公众号账号，并配置默认同步账号、作者和草稿摘要策略。</p>
            </div>
            <button
              onClick={handleBindWechat}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all text-sm font-medium"
            >
              <Link2 className="w-4 h-4" /> 绑定公众号
            </button>
          </div>

          {wechatLoading ? (
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> 正在读取绑定状态...
            </div>
          ) : (
            <>
              {bindMessage && (
                <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${bindMessage.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-600 border border-rose-200"}`}>
                  {bindMessage.text}
                </div>
              )}


              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-gray-500">
                  <span>默认同步账号</span>
                  <select
                    value={wechatSettings.defaultAccountId || ""}
                    onChange={(e) => setWechatSettings((prev) => ({ ...prev, defaultAccountId: e.target.value }))}
                    className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-300/40"
                  >
                    <option value="">未选择</option>
                    {wechatAccounts.map((account) => (
                      <option key={account.id} value={account.id}>{account.accountName}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm text-gray-500">
                  <span>默认作者名</span>
                  <input
                    value={wechatSettings.defaultAuthor || ""}
                    onChange={(e) => setWechatSettings((prev) => ({ ...prev, defaultAuthor: e.target.value }))}
                    className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-300/40"
                    placeholder="同步时默认作者名"
                  />
                </label>

                <label className="space-y-2 text-sm text-gray-500">
                  <span>默认摘要策略</span>
                  <select
                    value={wechatSettings.defaultDigestMode || "auto"}
                    onChange={(e) => setWechatSettings((prev) => ({ ...prev, defaultDigestMode: e.target.value }))}
                    className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-300/40"
                  >
                    <option value="auto">自动截取正文前 120 字</option>
                    <option value="manual">手动填写优先</option>
                  </select>
                </label>

                <label className="space-y-2 text-sm text-gray-500">
                  <span>默认封面策略</span>
                  <select
                    value={wechatSettings.defaultCoverMode || "first-image"}
                    onChange={(e) => setWechatSettings((prev) => ({ ...prev, defaultCoverMode: e.target.value }))}
                    className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-300/40"
                  >
                    <option value="first-image">使用正文首图</option>
                    <option value="manual">每次手动指定</option>
                  </select>
                </label>
              </div>

              <div className="rounded-xl bg-gray-50 px-4 py-4">
                <div className="text-xs font-semibold text-gray-500 mb-3">已绑定账号</div>
                {wechatAccounts.length === 0 ? (
                  <div className="text-sm text-gray-400">当前还没有绑定任何公众号账号。</div>
                ) : (
                  <div className="space-y-2">
                    {wechatAccounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm text-gray-600 border border-gray-100">
                        <span>{account.accountName}</span>
                        <span className="text-xs text-gray-400">{account.principalName || "未返回主体信息"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveWechatSettings}
                  disabled={wechatSaving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-purple-200/50 transition-all disabled:opacity-50"
                >
                  {wechatSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 保存公众号设置
                </button>
              </div>
            </>
          )}
        </div>

        {PLATFORMS.map((platform) => (
          <div key={platform} className="bg-white rounded-2xl p-7 shadow-sm border border-purple-50">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span>{PLATFORM_ICONS[platform]}</span>
              {platform}
            </h3>
            <textarea
              value={prompts[platform] || ""}
              onChange={(e) => setPrompts((prev) => ({ ...prev, [platform]: e.target.value }))}
              className="w-full h-40 bg-gray-50 rounded-xl p-5 text-sm text-gray-700 outline-none resize-none focus:ring-2 focus:ring-purple-300/40 transition-all placeholder:text-gray-300"
              placeholder={`输入${platform}的生成提示词...`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
