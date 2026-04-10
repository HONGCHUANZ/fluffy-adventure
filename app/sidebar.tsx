// app/sidebar.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Flame, X } from "lucide-react";
import { useStore } from "@/store/useStore";

interface CategoryItem {
  id: string;
  name: string;
}

export default function Sidebar() {
  const { activeCategoryId, setActiveCategory, sidebarCollapsed, toggleSidebar, bumpContentKey } = useStore();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (e) {
      console.error("Failed to load categories:", e);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleAddCategory = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const id = trimmed.replace(/\s+/g, "_").toLowerCase().slice(0, 32);
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: trimmed }),
    });
    setNewName("");
    setShowModal(false);
    loadCategories();
    setActiveCategory(id);
    bumpContentKey();
  };

  return (
    <>
      <aside
        className={`flex flex-col bg-white transition-all duration-300 shrink-0 ${
          sidebarCollapsed ? "w-20" : "w-72"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-20">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center shrink-0 shadow-md"
            style={{ boxShadow: "0 2px 8px rgba(30,41,59,0.25)" }}
          >
            <Flame className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <span
              className="text-2xl font-black tracking-wide"
              style={{
                fontFamily: '"STLiti", "LiSu", "SimSun", serif',
                background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3b7dd8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              马牛羊
            </span>
          )}
        </div>

        {/* Categories */}
        <div className="flex-1 px-4 space-y-2 overflow-y-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all ${
                activeCategoryId === cat.id
                  ? "bg-accent/8 text-accent shadow-sm"
                  : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 ring-4 ring-green-400/15" />
                {sidebarCollapsed && (
                  <span className="text-base font-bold">{cat.name[0]}</span>
                )}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{cat.name}</div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Bottom actions */}
        <div className="px-4 pb-4 space-y-2">
          <button
            onClick={() => setShowModal(true)}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors text-sm"
          >
            <Plus className="w-5 h-5 shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">新建分类</span>}
          </button>
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors text-sm"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5 shrink-0" />
                <span className="font-medium">收起</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Add category modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-8 w-96 space-y-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-lg">新建分类</h4>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-2 block font-semibold tracking-wide uppercase">分类名称</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                placeholder="例如：AI编程选题监控"
                autoFocus
                className="w-full bg-gray-50 rounded-xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/20 font-medium placeholder:text-gray-300"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowModal(false)} className="px-6 py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors rounded-xl font-medium">
                取消
              </button>
              <button
                onClick={handleAddCategory}
                disabled={!newName.trim()}
                className="px-6 py-3 bg-accent rounded-xl text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
