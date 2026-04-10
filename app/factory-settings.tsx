// app/factory-settings.tsx

"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { Save, RotateCcw, ArrowLeft, Check } from "lucide-react";

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

  useEffect(() => {
    fetch("/api/factory/prompts")
      .then((res) => res.json())
      .then((data) => setPrompts(data.prompts || {}));
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
