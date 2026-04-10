// app/tab-nav.tsx

"use client";

import { useStore } from "@/store/useStore";

const tabs = [
  { key: "home", label: "首页" },
  { key: "content", label: "内容" },
  { key: "report", label: "选题报告" },
  { key: "records", label: "记录" },
  { key: "settings", label: "监控设置" },
];

const specialTab = { key: "factory", label: "✨ 内容工厂" };

export default function TabNav() {
  const { activeTab, setActiveTab } = useStore();

  return (
    <div className="flex items-center h-16 px-8">
      <div className="flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-white text-accent shadow-sm"
                : "text-gray-400 hover:text-gray-600 hover:bg-white/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1" />
      <button
        onClick={() => setActiveTab(specialTab.key)}
        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
          activeTab === specialTab.key
            ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-200"
            : "bg-purple-50 text-purple-600 hover:bg-purple-100 hover:shadow-md"
        }`}
      >
        {specialTab.label}
      </button>
    </div>
  );
}
