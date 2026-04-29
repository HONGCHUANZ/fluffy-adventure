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

  // WeChat individual account config
  const [wechatAppId, setWechatAppId] = useState("");
  const [wechatAppSecret, setWechatAppSecret] = useState("");
  const [wechatAuthor, setWechatAuthor] = useState("");
  const [wechatConnected, setWechatConnected] = useState(false);
  const [wechatAccountName, setWechatAccountName] = useState("");
  const [wechatLoading, setWechatLoading] = useState(false);
  const [wechatVerifying, setWechatVerifying] = useState(false);
  const [wechatMessage, setWechatMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
        const accounts = data.accounts || [];
        const settings = data.settings || {};
        if (settings.wechatAppId) setWechatAppId(settings.wechatAppId);
        if (settings.wechatAppSecret) setWechatAppSecret(settings.wechatAppSecret);
        if (settings.wechatAuthor) setWechatAuthor(settings.wechatAuthor);
        if (accounts.length > 0) {
          setWechatConnected(true);
          setWechatAccountName(accounts[0].accountName);
        }
      })
      .catch(() => {})
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

  const handleVerifyWechat = async () => {
    if (!wechatAppId.trim() || !wechatAppSecret.trim()) {
      setWechatMessage({ type: "error", text: "请先填写 AppID 和 AppSecret" });
      return;
    }
    setWechatVerifying(true);
    setWechatMessage(null);
    try {
      const res = await fetch("/api/wechat/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: wechatAppId.trim(), appSecret: wechatAppSecret.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "验证失败");
      setWechatConnected(true);
      setWechatAccountName(data.account?.accountName || wechatAppId);
      setWechatMessage({ type: "success", text: `公众号 "${data.account?.accountName || wechatAppId}" 配置成功！` });
    } catch (err: any) {
      setWechatMessage({ type: "error", text: err.message || "验证失败" });
    } finally {
      setWechatVerifying(false);
    }
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

      {/* Content */}
      <div className="flex-1 overflow-auto p-8 space-y-8 max-w-4xl">
        {/* WeChat 公众号配置区块 */}
        <div className="bg-white rounded-2xl p-7 shadow-sm border border-purple-50 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-purple-500" /> 公众号草稿箱同步（个人模式）
            </h3>
            <p className="text-xs text-gray-400 mt-2">直接填入公众号的 AppID 和 AppSecret，即可将内容同步到草稿箱，无需第三方平台。</p>
          </div>

          {wechatLoading ? (
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> 读取配置中...
            </div>
          ) : wechatConnected ? (
            <>
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-700">{wechatAccountName || "公众号"}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">已连接 · 草稿箱同步功能可用</p>
                </div>
              </div>

              <label className="block space-y-2 text-sm text-gray-500">
                <span>默认作者名</span>
                <input
                  value={wechatAuthor}
                  onChange={(e) => setWechatAuthor(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-300/40"
                  placeholder="同步草稿时自动填入作者名"
                />
              </label>

              <div className="rounded-xl bg-gray-50 px-5 py-4 space-y-4">
                <div className="text-xs font-semibold text-gray-500">公众号凭证（已保存）</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1.5 text-xs text-gray-400">
                    <span>AppID</span>
                    <input
                      value={wechatAppId}
                      onChange={(e) => setWechatAppId(e.target.value)}
                      className="w-full rounded-lg bg-white px-3 py-2.5 text-sm text-gray-600 outline-none border border-gray-100"
                      placeholder="wx..."
                    />
                  </label>
                  <label className="space-y-1.5 text-xs text-gray-400">
                    <span>AppSecret</span>
                    <input
                      value={wechatAppSecret}
                      onChange={(e) => setWechatAppSecret(e.target.value)}
                      type="password"
                      className="w-full rounded-lg bg-white px-3 py-2.5 text-sm text-gray-600 outline-none border border-gray-100"
                      placeholder="..."
                    />
                  </label>
                </div>
                <button
                  onClick={handleVerifyWechat}
                  disabled={wechatVerifying}
                  className="text-xs text-purple-500 hover:text-purple-700 font-medium"
                >
                  {wechatVerifying ? "验证中..." : "更新凭证"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-400">去微信公众号后台获取 AppID 和 AppSecret：登录 mp.weixin.qq.com → 设置与开发 → 基本配置。</p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2 text-sm text-gray-500">
                  <span>AppID</span>
                  <input
                    value={wechatAppId}
                    onChange={(e) => setWechatAppId(e.target.value)}
                    className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-300/40"
                    placeholder="wx开头的18位ID"
                  />
                </label>
                <label className="block space-y-2 text-sm text-gray-500">
                  <span>AppSecret</span>
                  <input
                    value={wechatAppSecret}
                    onChange={(e) => setWechatAppSecret(e.target.value)}
                    type="password"
                    className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-300/40"
                    placeholder="公众号 AppSecret"
                  />
                </label>
              </div>
              <button
                onClick={handleVerifyWechat}
                disabled={wechatVerifying || !wechatAppId.trim() || !wechatAppSecret.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-purple-200/50 transition-all disabled:opacity-50"
              >
                {wechatVerifying ? <><Loader2 className="w-4 h-4 animate-spin" /> 验证中...</> : <><Link2 className="w-4 h-4" /> 验证并保存</>}
              </button>
            </>
          )}

          {wechatMessage && (
            <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${wechatMessage.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-600 border border-rose-200"}`}>
              {wechatMessage.text}
            </div>
          )}
        </div>

        {/* 提示词配置区块 */}
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
