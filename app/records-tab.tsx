// app/records-tab.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { Trash2, RefreshCw, Clock, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, Zap } from "lucide-react";

interface RecordDetail {
  keyword: string;
  fetched: number;
  new: number;
  duplicate: number;
  status: 'success' | 'failed';
  error?: string;
}

interface SearchRecord {
  id: number;
  category_id: string;
  triggered_by: string;
  status: string;
  keywords: string;
  platforms: string;
  total_fetched: number;
  total_new: number;
  total_duplicate: number;
  duration_ms: number;
  error_message: string;
  details: string;
  created_at: string;
}

export default function RecordsTab() {
  const { activeCategoryId } = useStore();
  const [records, setRecords] = useState<SearchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all"); // all, success, partial, failed

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/records?categoryId=${activeCategoryId}&limit=100`);
      const data = await res.json();
      setRecords(data.records || []);
    } catch (e) {
      console.error("Failed to fetch records:", e);
    } finally {
      setLoading(false);
    }
  }, [activeCategoryId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filtered = records.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const handleClear = async () => {
    await fetch("/api/records", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: activeCategoryId }),
    });
    fetchRecords();
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const formatTime = (created: string) => {
    // "2026-04-10 15:30:00" → "4月10日 15:30"
    const d = new Date(created + "+08:00");
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const successCount = records.filter((r) => r.status === "success").length;
  const failCount = records.filter((r) => r.status === "failed").length;
  const partialCount = records.filter((r) => r.status === "partial").length;
  const totalNew = records.reduce((s, r) => s + r.total_new, 0);

  return (
    <div className="p-8 space-y-8">
      {/* Stats header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-white rounded-2xl px-6 py-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{records.length}</div>
              <div className="text-xs text-gray-400 font-medium">总记录数</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-2xl px-6 py-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{successCount}</div>
              <div className="text-xs text-gray-400 font-medium">成功</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-2xl px-6 py-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{partialCount + failCount}</div>
              <div className="text-xs text-gray-400 font-medium">异常</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-2xl px-6 py-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{totalNew}</div>
              <div className="text-xs text-gray-400 font-medium">累计新增</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchRecords}
            className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:shadow-sm transition-all font-medium"
          >
            <RefreshCw className="w-4 h-4" /> 刷新
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl text-sm text-gray-400 hover:text-red-500 hover:shadow-sm transition-all font-medium"
          >
            <Trash2 className="w-4 h-4" /> 清除全部
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400 font-medium">筛选</span>
        <div className="h-6 w-px bg-gray-200" />
        {[
          { key: "all", label: `全部 (${records.length})` },
          { key: "success", label: `成功 (${successCount})` },
          { key: "partial", label: `部分失败 (${partialCount})` },
          { key: "failed", label: `失败 (${failCount})` },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              filter === f.key
                ? "bg-accent text-white shadow-lg shadow-accent/25"
                : "bg-white text-gray-400 hover:text-gray-600 hover:shadow-sm"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Records list */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-24 text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-gray-200 border-t-accent rounded-full mx-auto mb-4" />
            <p className="text-sm">加载中...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-gray-400 bg-white rounded-2xl shadow-sm">
            <Clock className="w-10 h-10 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">暂无记录</p>
            <p className="text-sm mt-2">点击「快速更新」后此处将显示搜索记录</p>
          </div>
        ) : (
          filtered.map((record) => {
            const details: RecordDetail[] = JSON.parse(record.details || "[]");
            const isExpanded = expandedId === record.id;

            return (
              <div key={record.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Summary row */}
                <button
                  onClick={() => toggleExpand(record.id)}
                  className="w-full flex items-center justify-between px-7 py-5 hover:bg-gray-50/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Status icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      record.status === "success" ? "bg-green-50" :
                      record.status === "partial" ? "bg-orange-50" : "bg-red-50"
                    }`}>
                      {record.status === "success" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : record.status === "partial" ? (
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-700">
                          {formatTime(record.created_at)}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          record.status === "success" ? "bg-green-50 text-green-600" :
                          record.status === "partial" ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"
                        }`}>
                          {record.status === "success" ? "成功" :
                           record.status === "partial" ? "部分失败" : "失败"}
                        </span>
                        <span className="text-sm text-accent font-bold">+{record.total_new} 条</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                        <span>关键词: {JSON.parse(record.keywords || "[]").join(", ")}</span>
                        <span>平台: {JSON.parse(record.platforms || "[]").join(", ")}</span>
                        <span>耗时: {formatDuration(record.duration_ms)}</span>
                        {record.total_duplicate > 0 && (
                          <span>{record.total_duplicate} 条重复</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {record.triggered_by === "auto" && (
                      <span className="text-xs text-gray-300 bg-gray-50 px-2 py-1 rounded font-medium">自动</span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-7 pb-6 border-t border-gray-50">
                    <div className="mt-5 space-y-3">
                      {details.length > 0 ? details.map((d, i) => (
                        <div key={i} className={`flex items-start gap-3 p-4 rounded-xl ${
                          d.status === "success" ? "bg-green-50/50" : "bg-red-50/50"
                        }`}>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0 ${
                            d.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>
                            {d.keyword}
                          </span>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{d.fetched} 条</span>
                            <span className="text-green-600">+{d.new} 新增</span>
                            {d.duplicate > 0 && <span className="text-gray-400">{d.duplicate} 重复</span>}
                            {d.error && <span className="text-red-500 text-xs">{d.error}</span>}
                          </div>
                        </div>
                      )) : (
                        <p className="text-sm text-gray-400 text-center py-4">无详细信息</p>
                      )}
                    </div>
                    {record.error_message && (
                      <div className="mt-3 p-4 bg-red-50 rounded-xl text-sm text-red-600">
                        <XCircle className="w-4 h-4 inline mr-2" />
                        {record.error_message}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
