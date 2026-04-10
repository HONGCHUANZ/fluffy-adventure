// app/settings-tab.tsx

"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Check, Save, RotateCcw } from "lucide-react";
import { useStore } from "@/store/useStore";
import { PLATFORMS, getMonitorConfig } from "@/data/mock";

interface KeywordWithPlatforms {
  keyword: string;
  platforms: string[];
}

interface BloggerRow {
  id: number;
  name: string;
  platform: string;
}

export default function SettingsTab() {
  const { activeCategoryId } = useStore();
  const config = getMonitorConfig(activeCategoryId);

  const [platforms, setPlatforms] = useState<string[]>(config?.platforms || []);
  const [keywords, setKeywords] = useState<KeywordWithPlatforms[]>([]);
  const [bloggers, setBloggers] = useState<BloggerRow[]>([]);
  const [runTime, setRunTime] = useState(config?.runTime || "08:00");

  // Keyword input state
  const [keywordInput, setKeywordInput] = useState("");
  const [keywordPlatforms, setKeywordPlatforms] = useState<string[]>([]);
  const [showKeywordPlatforms, setShowKeywordPlatforms] = useState(false);

  // Blogger modal
  const [showBloggerModal, setShowBloggerModal] = useState(false);
  const [newBlogger, setNewBlogger] = useState({ name: "", platform: PLATFORMS[0] });

  // Loading states
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadKeywords();
    loadBloggers();
  }, [activeCategoryId]);

  async function loadKeywords() {
    try {
      const res = await fetch(`/api/keywords?categoryId=${activeCategoryId}`);
      const data = await res.json();
      setKeywords(data.keywords || []);
    } catch (e) {
      console.error("Failed to load keywords:", e);
    }
  }

  async function loadBloggers() {
    try {
      const res = await fetch(`/api/bloggers?categoryId=${activeCategoryId}`);
      const data = await res.json();
      setBloggers(data.bloggers || []);
    } catch (e) {
      console.error("Failed to load bloggers:", e);
    }
  }

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const startAddKeyword = () => {
    if (keywordInput.trim()) {
      const parts = keywordInput.split(/[,，\n]/).map((s) => s.trim()).filter(Boolean);
      // For batch add, use all selected platforms
      for (const kw of parts) {
        if (!keywords.find((k) => k.keyword === kw)) {
          addKeywordToDb(kw, platforms.length > 0 ? platforms : PLATFORMS);
        }
      }
      setKeywordInput("");
      loadKeywords();
    }
  };

  const addKeywordToDb = async (keyword: string, platformsList: string[]) => {
    await fetch("/api/keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: activeCategoryId, keyword, platforms: platformsList }),
    });
  };

  const removeKeyword = async (kw: string) => {
    await fetch("/api/keywords", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: activeCategoryId, keyword: kw }),
    });
    loadKeywords();
  };

  const toggleKeywordPlatform = async (kw: string, platform: string) => {
    const existing = keywords.find((k) => k.keyword === kw);
    if (!existing) return;
    const newPlatforms = existing.platforms.includes(platform)
      ? existing.platforms.filter((p) => p !== platform)
      : [...existing.platforms, platform];
    await fetch("/api/keywords", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: activeCategoryId, keyword: kw, platforms: newPlatforms }),
    });
    loadKeywords();
  };

  const addBlogger = async () => {
    if (newBlogger.name.trim()) {
      await fetch("/api/bloggers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: activeCategoryId, name: newBlogger.name.trim(), platform: newBlogger.platform }),
      });
      setNewBlogger({ name: "", platform: PLATFORMS[0] });
      setShowBloggerModal(false);
      loadBloggers();
    }
  };

  const removeBlogger = async (id: number) => {
    await fetch("/api/bloggers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadBloggers();
  };

  const handleSave = async () => {
    setSaving(true);
    // In a real app, save platforms to DB. For now just show feedback.
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-8 space-y-10 max-w-3xl">
      {/* Platforms */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 mb-5 tracking-widest uppercase">监控平台</h3>
        <div className="flex flex-wrap gap-3">
          {PLATFORMS.map((p) => {
            const active = platforms.includes(p);
            return (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className={`flex items-center gap-2.5 px-6 py-3.5 rounded-xl transition-all text-sm font-semibold ${
                  active
                    ? "bg-accent/8 text-accent shadow-sm"
                    : "bg-white text-gray-400 hover:text-gray-600 hover:shadow-sm"
                }`}
              >
                {active ? <Check className="w-4 h-4" /> : <span className="w-4 h-4" />}
                {p}
              </button>
            );
          })}
        </div>
      </section>

      {/* Keywords with platform selection */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 mb-5 tracking-widest uppercase">对标关键词</h3>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          {/* Add keyword input */}
          <div className="flex flex-wrap gap-2.5 mb-4">
            {keywords.map((kw) => (
              <div key={kw.keyword} className="group relative">
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium">
                  <span>{kw.keyword}</span>
                  <span className="text-xs text-gray-300">({kw.platforms.join(", ")})</span>
                  <button onClick={() => removeKeyword(kw.keyword)} className="text-gray-300 hover:text-gray-500 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Platform selector popup */}
                <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 p-3 z-20 hidden group-hover:block min-w-[200px]">
                  <p className="text-xs text-gray-400 mb-2 font-semibold">监控平台</p>
                  <div className="space-y-1">
                    {PLATFORMS.map((p) => (
                      <label key={p} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={kw.platforms.includes(p)}
                          onChange={() => toggleKeywordPlatform(kw.keyword, p)}
                          className="rounded text-accent focus:ring-accent/20"
                        />
                        <span className="text-gray-600">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startAddKeyword()}
                placeholder="输入关键词后回车添加..."
                className="bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-300 flex-1 py-1"
              />
              <button
                onClick={startAddKeyword}
                className="p-1.5 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            已添加 {keywords.length} 个关键词 · 悬停关键词可修改监控平台 · 支持逗号批量添加
          </p>
        </div>
      </section>

      {/* Bloggers */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 mb-5 tracking-widest uppercase">对标博主/账号</h3>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400">
                <th className="text-left px-6 py-4 font-semibold">博主名称</th>
                <th className="text-left px-6 py-4 font-semibold">平台</th>
                <th className="text-right px-6 py-4 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {bloggers.map((b, idx) => (
                <tr key={b.id} className={`hover:bg-gray-50/50 transition-colors ${idx !== bloggers.length - 1 ? "border-b border-gray-50" : ""}`}>
                  <td className="px-6 py-4 font-medium">{b.name}</td>
                  <td className="px-6 py-4 text-gray-400">{b.platform}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => removeBlogger(b.id)} className="text-gray-300 hover:text-red-400 transition-colors p-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={() => setShowBloggerModal(true)}
          className="flex items-center gap-2.5 mt-4 text-sm text-accent hover:text-accent/80 transition-colors font-semibold"
        >
          <Plus className="w-5 h-5" /> 添加博主
        </button>
      </section>

      {/* Run settings */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 mb-5 tracking-widest uppercase">运行设置</h3>
        <div className="bg-white rounded-2xl p-7 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">运行频率</span>
            <span className="text-sm font-semibold">每天一次</span>
          </div>
          <div className="flex items-center justify-between pt-5 border-t border-gray-100">
            <span className="text-sm text-gray-400">运行时间</span>
            <select
              value={runTime}
              onChange={(e) => setRunTime(e.target.value)}
              className="bg-gray-50 rounded-xl px-5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 font-medium"
            >
              {Array.from({ length: 24 }, (_, h) => {
                const v = `${String(h).padStart(2, "0")}:00`;
                return <option key={v} value={v}>{v}</option>;
              })}
            </select>
          </div>
          <div className="flex items-center justify-between pt-5 border-t border-gray-100">
            <span className="text-sm text-gray-400">AI 分析引擎</span>
            <span className="text-sm font-semibold">OpenAI ChatGPT</span>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-accent to-purple-500 rounded-xl text-sm font-semibold text-white hover:shadow-lg hover:shadow-accent/25 transition-all disabled:opacity-50"
        >
          {saving ? (
            <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? "已保存 ✓" : "保存设置"}
        </button>
        <button className="flex items-center gap-2.5 px-7 py-3.5 bg-white rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:shadow-sm transition-all font-medium">
          <RotateCcw className="w-4 h-4" /> 重置
        </button>
      </div>

      {/* Blogger modal */}
      {showBloggerModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowBloggerModal(false)}>
          <div className="bg-white rounded-2xl p-8 w-96 space-y-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-bold text-lg">添加博主</h4>
            <div>
              <label className="text-xs text-gray-400 mb-2 block font-semibold tracking-wide uppercase">平台</label>
              <select
                value={newBlogger.platform}
                onChange={(e) => setNewBlogger((p) => ({ ...p, platform: e.target.value }))}
                className="w-full bg-gray-50 rounded-xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/20 font-medium"
              >
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-2 block font-semibold tracking-wide uppercase">博主名称</label>
              <input
                type="text"
                value={newBlogger.name}
                onChange={(e) => setNewBlogger((p) => ({ ...p, name: e.target.value }))}
                placeholder="@博主名"
                className="w-full bg-gray-50 rounded-xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/20 font-medium placeholder:text-gray-300"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowBloggerModal(false)} className="px-6 py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors rounded-xl font-medium">
                取消
              </button>
              <button onClick={addBlogger} className="px-6 py-3 bg-accent rounded-xl text-sm font-semibold text-white hover:bg-accent/90">
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
