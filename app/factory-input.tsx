// app/factory-input.tsx

"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { Settings, Sparkles, Clock, Wand2 } from "lucide-react";

const FACTORY_PLATFORMS = ["公众号文章", "小红书笔记", "Twitter 推文", "视频脚本"];
const PLATFORM_ICONS: Record<string, string> = {
  "公众号文章": "📝",
  "小红书笔记": "📕",
  "Twitter 推文": "🐦",
  "视频脚本": "🎬",
};

export default function FactoryInput() {
  const {
    factoryInput, factoryPlatforms, factoryTwitterMode,
    setFactoryInput, toggleFactoryPlatform, setFactoryTwitterMode,
    setFactoryView, setFactorySessionId, setFactoryOptimizeSource,
  } = useStore();

  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!factoryInput.trim() || factoryPlatforms.length === 0) return;

    setGenerating(true);

    const sessionRes = await fetch("/api/factory/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: factoryInput.trim(),
        twitterMode: factoryTwitterMode,
        platforms: factoryPlatforms,
      }),
    });
    const sessionData = await sessionRes.json();
    const sessionId = sessionData.sessionId;

    const genRes = await fetch("/api/factory/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        input: factoryInput.trim(),
        platforms: factoryPlatforms,
        twitterMode: factoryTwitterMode,
      }),
    });
    const genData = await genRes.json();

    if (genData.error) {
      alert("生成失败: " + genData.error);
      setGenerating(false);
      return;
    }

    setFactorySessionId(sessionId);
    setFactoryView("editor");
    setGenerating(false);
  };

  const anyPlatformSelected = factoryPlatforms.length > 0;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-purple-50/50 via-white to-white">
      <div className="absolute right-8 flex gap-2" style={{ top: "68px" }}>
        <button
          onClick={() => {
            setFactoryOptimizeSource({ platform: "公众号文章", content: factoryInput });
            setFactoryView("optimize");
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl text-xs text-gray-400 hover:text-purple-600 hover:shadow-sm transition-all"
        >
          <Wand2 className="w-3.5 h-3.5" /> 排版优化
        </button>
        <button
          onClick={() => setFactoryView("editor")}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl text-xs text-gray-400 hover:text-purple-600 hover:shadow-sm transition-all"
        >
          <Clock className="w-3.5 h-3.5" /> 创作记录
        </button>
        <button
          onClick={() => setFactoryView("settings")}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl text-xs text-gray-400 hover:text-purple-600 hover:shadow-sm transition-all"
        >
          <Settings className="w-3.5 h-3.5" /> 提示词设置
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-3xl space-y-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-100 text-purple-600 rounded-full text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" /> AI 多平台内容创作
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              今天想写什么？
            </h2>
            <p className="text-sm text-gray-400 mt-2">输入创作需求，AI 为你生成多平台内容</p>
          </div>

          <textarea
            value={factoryInput}
            onChange={(e) => setFactoryInput(e.target.value)}
            placeholder="在这里输入你的创作需求..."
            className="w-full h-48 bg-white rounded-2xl p-6 text-sm text-gray-700 placeholder:text-gray-300 outline-none resize-none shadow-sm focus:ring-2 focus:ring-purple-300/40 transition-all"
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400 font-medium">选择生成平台</span>
              {factoryPlatforms.includes("Twitter 推文") && (
                <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-sm">
                  <span className="text-xs text-gray-400">Twitter 模式:</span>
                  <button
                    onClick={() => setFactoryTwitterMode("single")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      factoryTwitterMode === "single"
                        ? "bg-purple-500 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    单条推文
                  </button>
                  <button
                    onClick={() => setFactoryTwitterMode("thread")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      factoryTwitterMode === "thread"
                        ? "bg-purple-500 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    Thread
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {FACTORY_PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => toggleFactoryPlatform(p)}
                  className={`flex items-center gap-2.5 px-6 py-3.5 rounded-xl transition-all text-sm font-semibold ${
                    factoryPlatforms.includes(p)
                      ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-200/50"
                      : "bg-white text-gray-400 hover:text-gray-600 hover:shadow-sm"
                  }`}
                >
                  <span>{PLATFORM_ICONS[p]}</span>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={handleGenerate}
              disabled={generating || !factoryInput.trim() || !anyPlatformSelected}
              className="flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600 text-white rounded-2xl text-sm font-bold hover:shadow-xl hover:shadow-purple-200/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            >
              {generating ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                  AI 创作中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  开始生成
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
