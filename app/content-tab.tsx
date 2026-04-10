// app/content-tab.tsx

"use client";

import { ArrowLeft, ArrowRight, Flame, ThumbsUp, MessageCircle, Repeat, Star, Sparkles, RefreshCw, ExternalLink, Check } from "lucide-react";
import { useRef, useEffect, useState, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { PLATFORMS, PLATFORM_COLORS } from "@/data/mock";

interface ContentItem {
  id: string;
  title: string;
  platform: string;
  blogger: string;
  followers: string;
  heat: number;
  engagement: { likes: number; comments: number; shares: number };
  collectedAt: string;
  date: string;
  desc?: string;
  coverUrl?: string;
  noteUrl?: string;
  keyword?: string;
}

export default function ContentTab() {
  const { activeCategoryId, selectedPlatforms, togglePlatform, selectedDate, setSelectedDate, isRefreshing, setRefreshing, refreshMessage, setRefreshMessage, contentKey } = useStore();
  const dateScrollRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<ContentItem[]>([]);
  const [dateCounts, setDateCounts] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const platformsParam = selectedPlatforms.length > 0 ? selectedPlatforms.join(",") : "";
      const dateParam = selectedDate || "4月10日";

      // Fetch content list
      const listUrl = `/api/content?categoryId=${activeCategoryId}&date=${encodeURIComponent(dateParam)}&platforms=${platformsParam}`;
      const listRes = await fetch(listUrl);
      const listData = await listRes.json();
      setItems(listData.items || []);

      // Fetch date counts
      const datesUrl = `/api/content?categoryId=${activeCategoryId}&mode=dates&date=${encodeURIComponent(dateParam)}&platforms=${platformsParam}`;
      const datesRes = await fetch(datesUrl);
      const datesData = await datesRes.json();
      setDateCounts(datesData.dates || []);
    } catch (e) {
      console.error("Failed to fetch content:", e);
    } finally {
      setLoading(false);
    }
  }, [activeCategoryId, selectedPlatforms, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Re-fetch when contentKey changes (triggered by refresh)
  useEffect(() => {
    fetchData();
  }, [contentKey]);

  const dates = dateCounts.map((d) => d.date);
  const today = new Date();
  const todayStr = `${today.getMonth() + 1}月${today.getDate()}日`;

  const scrollDates = (dir: number) => {
    if (dateScrollRef.current) dateScrollRef.current.scrollBy({ left: dir * 180, behavior: "smooth" });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMessage("正在获取小红书数据...");
    try {
      const res = await fetch("/api/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: activeCategoryId }),
      });
      const data = await res.json();
      if (data.error) {
        setRefreshMessage(`错误: ${data.error}`);
      } else {
        setRefreshMessage(`成功获取 ${data.newItems} 条新内容`);
      }
    } catch (e: any) {
      setRefreshMessage(`错误: ${e.message}`);
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshMessage(""), 3000);
    }
  };

  const hasXhsKeywords = dateCounts.length > 0 || items.length > 0;

  return (
    <div className="p-8 space-y-8">
      {/* Platform filter */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2">
        <span className="text-sm text-gray-400 shrink-0 font-medium">平台</span>
        <div className="h-6 w-px bg-gray-200 shrink-0" />
        <button
          onClick={() => togglePlatform("all")}
          className={`px-6 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
            selectedPlatforms.length === 0
              ? "bg-accent text-white shadow-lg shadow-accent/25"
              : "bg-white text-gray-400 hover:text-gray-700 hover:shadow-sm"
          }`}
        >
          全部
        </button>
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => togglePlatform(p)}
            className={`px-6 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              selectedPlatforms.includes(p)
                ? "bg-accent text-white shadow-lg shadow-accent/25"
                : "bg-white text-gray-400 hover:text-gray-700 hover:shadow-sm"
            }`}
          >
            {p}
          </button>
        ))}
        {/* Quick refresh button */}
        <div className="ml-auto shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-accent to-purple-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-accent/25 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "更新中..." : "快速更新"}
          </button>
        </div>
      </div>

      {/* Refresh message */}
      {isRefreshing || refreshMessage ? (
        <div className={`flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-medium ${
          isRefreshing ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
        }`}>
          {isRefreshing ? (
            <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          ) : (
            <Check className="w-4 h-4 shrink-0" />
          )}
          {refreshMessage || "正在更新..."}
        </div>
      ) : null}

      {/* Date cards */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400 shrink-0 font-medium">日期</span>
        <div className="h-6 w-px bg-gray-200 shrink-0" />
        <button onClick={() => scrollDates(-1)} className="p-3 rounded-xl bg-white hover:shadow-md text-gray-400 shrink-0 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div ref={dateScrollRef} className="flex gap-4 overflow-x-auto flex-1 scrollbar-hide py-1">
          {dates.length === 0 ? (
            <div className="text-sm text-gray-400 py-4">暂无数据，点击"快速更新"获取内容</div>
          ) : (
            dates.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                className={`flex-shrink-0 w-[150px] px-5 py-4 rounded-2xl text-center transition-all ${
                  d === selectedDate
                    ? "bg-white shadow-lg shadow-gray-200/80 ring-2 ring-accent/20"
                    : "bg-white/60 hover:bg-white hover:shadow-md"
                }`}
              >
                <div className="text-sm font-bold flex items-center justify-center gap-2">
                  {d}
                  {d === todayStr && <span className="w-2 h-2 rounded-full bg-accent" />}
                </div>
                <div className="text-xs text-gray-400 mt-2 font-medium">{dateCounts.find((dc) => dc.date === d)?.count || 0} 条内容</div>
              </button>
            ))
          )}
        </div>
        <button onClick={() => scrollDates(1)} className="p-3 rounded-xl bg-white hover:shadow-md text-gray-400 shrink-0 transition-all">
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

      {/* Content list */}
      <div className="space-y-5">
        {loading ? (
          <div className="text-center py-24 text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-gray-200 border-t-accent rounded-full mx-auto mb-4" />
            <p className="text-sm">加载中...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <Sparkles className="w-10 h-10 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">暂无内容</p>
            <p className="text-sm mt-2">该日期或平台筛选下没有采集到内容</p>
            {!hasXhsKeywords && (
              <button
                onClick={handleRefresh}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-accent/25 transition-all"
              >
                <RefreshCw className="w-4 h-4" /> 快速更新获取数据
              </button>
            )}
          </div>
        ) : (
          items.map((item) => <ContentCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

function ContentCard({ item }: { item: ContentItem }) {
  return (
    <div className="bg-white rounded-2xl p-7 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group">
      <div className="flex items-start gap-5">
        {/* Heat badge */}
        <div className="shrink-0 flex flex-col items-center gap-2 pt-1">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
            <Flame className="w-7 h-7 text-orange-500" />
          </div>
          <span className="text-sm font-bold text-orange-500">{formatHeat(item.heat)}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-lg text-xs font-semibold text-white ${PLATFORM_COLORS[item.platform] || "bg-gray-500"}`}>
              {item.platform}
            </span>
            <span className="text-sm text-gray-400">{item.collectedAt}</span>
            {item.keyword && (
              <span className="text-xs text-gray-300 bg-gray-50 px-2 py-0.5 rounded">#{item.keyword}</span>
            )}
          </div>
          <h3 className="text-base font-semibold mb-3 group-hover:text-accent transition-colors leading-relaxed">{item.title}</h3>
          {item.desc && (
            <p className="text-sm text-gray-400 mb-3 line-clamp-2 leading-relaxed">{item.desc}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              {item.blogger} {item.followers ? `· ${item.followers}粉丝` : ""}
            </span>
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-5 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="flex items-center gap-1.5 text-gray-400 text-sm">
                  <ThumbsUp className="w-4 h-4" /> {item.engagement.likes}
                </span>
                <span className="flex items-center gap-1.5 text-gray-400 text-sm">
                  <MessageCircle className="w-4 h-4" /> {item.engagement.comments}
                </span>
                <span className="flex items-center gap-1.5 text-gray-400 text-sm">
                  {item.platform === "小红书" ? <Star className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                  {" "} {item.engagement.shares}
                </span>
              </div>
              {item.noteUrl && (
                <a
                  href={item.noteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-accent text-sm hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> 查看原文
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatHeat(heat: number): string {
  if (heat >= 1000) return `${(heat / 1000).toFixed(1)}K`;
  return heat.toString();
}
