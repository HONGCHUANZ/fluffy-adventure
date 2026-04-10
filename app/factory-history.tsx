// app/factory-history.tsx

"use client";

import { Plus, Trash2 } from "lucide-react";
import { useStore } from "@/store/useStore";

interface SessionItem {
  id: string;
  input: string;
  platforms: string[];
  created_at: string;
}

interface Props {
  sessions: SessionItem[];
  onRefresh: (sessions: SessionItem[]) => void;
}

export default function FactoryHistory({ sessions, onRefresh }: Props) {
  const {
    factorySessionId, setFactorySessionId, setFactoryView, setFactoryActivePlatform,
    resetFactoryInput,
  } = useStore();

  const handleNewSession = () => {
    resetFactoryInput();
    setFactoryView("input");
  };

  const handleSelectSession = (session: SessionItem) => {
    setFactorySessionId(session.id);
    setFactoryActivePlatform(session.platforms[0]);
    setFactoryView("editor");
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch("/api/factory/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id }),
    });
    const updated = sessions.filter((s) => s.id !== id);
    onRefresh(updated);
    if (factorySessionId === id) {
      handleNewSession();
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso + "+08:00");
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-white to-purple-50/20">
      {/* Header */}
      <div className="px-5 py-5 border-b border-purple-100/50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">创作记录</span>
          <span className="text-xs text-gray-400">{sessions.length} 条</span>
        </div>
      </div>

      {/* New session button */}
      <div className="px-4 py-3">
        <button
          onClick={handleNewSession}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 hover:shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> 新创作
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            暂无创作记录
          </div>
        ) : (
          sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelectSession(s)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all group ${
                factorySessionId === s.id
                  ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-200/50"
                  : "text-gray-500 hover:bg-purple-50 hover:text-purple-600"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{s.input}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs ${factorySessionId === s.id ? "text-white/70" : "text-gray-400"}`}>{formatDate(s.created_at)}</span>
                    <span className={`text-xs ${factorySessionId === s.id ? "text-white/50" : "text-gray-300"}`}>·</span>
                    <span className={`text-xs ${factorySessionId === s.id ? "text-white/70" : "text-gray-400"}`}>{s.platforms.join(", ")}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all shrink-0 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
