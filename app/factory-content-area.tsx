// app/factory-content-area.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { Copy, Edit3, Send, ArrowLeft, Wand2 } from "lucide-react";

const FACTORY_PLATFORMS = ["公众号文章", "小红书笔记", "Twitter 推文", "视频脚本"];
const PLATFORM_ICONS: Record<string, string> = {
  "公众号文章": "📝",
  "小红书笔记": "📕",
  "Twitter 推文": "🐦",
  "视频脚本": "🎬",
};

const PLATFORM_CAN_PUBLISH = ["公众号文章", "小红书笔记", "Twitter 推文"];

export default function FactoryContentArea() {
  const {
    factorySessionId, factoryActivePlatform, setFactoryActivePlatform, setFactoryView, setWechatSyncDraft,
  } = useStore();

  const [outputs, setOutputs] = useState<{ [platform: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [latestWechatSync, setLatestWechatSync] = useState<{ status: string; title: string; created_at: string; error_message?: string } | null>(null);

  const activeOutput = outputs[factoryActivePlatform] || "";

  const loadOutputs = useCallback(async () => {
    if (!factorySessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/factory/sessions?sessionId=${factorySessionId}`);
      const data = await res.json();
      setOutputs(data.outputs || {});
      setLatestWechatSync(data.latestWechatSync || null);
    } catch (e) {
      console.error("Failed to load outputs:", e);
    } finally {
      setLoading(false);
    }
  }, [factorySessionId]);

  useEffect(() => {
    loadOutputs();
  }, [loadOutputs]);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeOutput);
  };

  const handlePublish = () => {
    if (!factorySessionId || !activeOutput.trim()) return;
    setWechatSyncDraft({
      sessionId: factorySessionId,
      platform: factoryActivePlatform,
      html: activeOutput,
    });
  };

  const handleSaveEdit = async () => {
    await fetch("/api/factory/sessions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: factorySessionId,
        platform: factoryActivePlatform,
        content: editContent,
      }),
    });
    setOutputs((prev) => ({ ...prev, [factoryActivePlatform]: editContent }));
    setEditing(false);
  };

  const startEdit = () => {
    setEditContent(activeOutput);
    setEditing(true);
  };

  if (!factorySessionId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        选择或创建一个创作会话
      </div>
    );
  }

  const canPublish = PLATFORM_CAN_PUBLISH.includes(factoryActivePlatform);

  const formatSyncTime = (iso: string) => {
    const d = new Date(iso + "+08:00");
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-purple-50/30 to-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-7 py-4 border-b border-purple-100/50 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFactoryView("input")}
            className="p-2 rounded-xl text-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-base font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            {PLATFORM_ICONS[factoryActivePlatform]} {factoryActivePlatform}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const { setFactoryOptimizeSource, setFactoryView } = useStore.getState();
              setFactoryOptimizeSource({ platform: factoryActivePlatform, content: activeOutput });
              setFactoryView("optimize");
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
          >
            <Wand2 className="w-4 h-4" /> 排版优化
          </button>
          <button
            onClick={startEdit}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
          >
            <Edit3 className="w-4 h-4" /> 编辑
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
          >
            <Copy className="w-4 h-4" /> 复制
          </button>
          {canPublish && (
            <button
              onClick={handlePublish}
              disabled={!activeOutput.trim() || !factorySessionId}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" /> 同步草稿箱
            </button>
          )}
        </div>
      </div>

      {/* Sync status */}
      {latestWechatSync && (
        <div className={`mx-7 mt-4 flex items-center justify-between rounded-2xl px-5 py-3 text-sm ${latestWechatSync.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
          <div className="flex items-center gap-2">
            <span className="font-medium">{latestWechatSync.status === "success" ? "已同步到草稿箱" : "同步失败"}</span>
            {latestWechatSync.title && <span>· {latestWechatSync.title.slice(0, 20)}{latestWechatSync.title.length > 20 ? "…" : ""}</span>}
          </div>
          <div className="flex items-center gap-3">
            {latestWechatSync.error_message && <span className="text-xs opacity-75">{latestWechatSync.error_message}</span>}
            <span className="text-xs opacity-60">{formatSyncTime(latestWechatSync.created_at)}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-7">
        {loading ? (
          <div className="text-center py-24 text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-purple-200 border-t-purple-500 rounded-full mx-auto mb-4" />
            <p className="text-sm">加载中...</p>
          </div>
        ) : editing ? (
          <div className="flex flex-col h-full">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 bg-white rounded-2xl p-6 text-sm text-gray-700 outline-none resize-none shadow-sm focus:ring-2 focus:ring-purple-300/40"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditing(false)}
                className="px-5 py-2.5 text-sm text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl text-sm font-semibold hover:shadow-md transition-all"
              >
                保存
              </button>
            </div>
          </div>
        ) : activeOutput ? (
          <div className="bg-white rounded-2xl p-7 shadow-sm whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
            {activeOutput}
          </div>
        ) : (
          <div className="text-center py-24 text-gray-400">
            该平台暂无生成内容
          </div>
        )}
      </div>

      {/* Platform tabs */}
      <div className="px-7 py-4 border-t border-purple-100/50 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {FACTORY_PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => setFactoryActivePlatform(p)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                factoryActivePlatform === p
                  ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-200/50"
                  : "text-gray-400 hover:text-purple-600 hover:bg-purple-50"
              }`}
            >
              <span>{PLATFORM_ICONS[p]}</span>
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
