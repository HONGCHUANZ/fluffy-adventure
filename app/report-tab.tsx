// app/report-tab.tsx

"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Zap, TrendingUp, Calendar } from "lucide-react";
import { useStore } from "@/store/useStore";
import { getReportsByCategory } from "@/data/mock";

interface ReportData {
  id: string;
  date: string;
  itemCount: number;
  hotTopics: { title: string; description: string; growth: string }[];
  suggestions: { title: string; brief: string; sources: string }[];
}

export default function ReportTab() {
  const { activeCategoryId, reportView, setReportView, topicDays, setTopicDays } = useStore();
  const reports = getReportsByCategory(activeCategoryId);
  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({
    [reports[0]?.id]: true,
  });

  const toggleReport = (id: string) => {
    setExpandedReports((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-8 space-y-8">
      {/* View switcher */}
      <div className="flex items-center gap-4">
        <div className="flex bg-white rounded-xl p-1.5 shadow-sm">
          <button
            onClick={() => setReportView("date")}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              reportView === "date" ? "bg-accent text-white shadow-sm" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            按日期查看报告
          </button>
          <button
            onClick={() => setReportView("topic")}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              reportView === "topic" ? "bg-accent text-white shadow-sm" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            按选题汇总
          </button>
        </div>
      </div>

      {reportView === "date" ? (
        <DateReports reports={reports as ReportData[]} expandedReports={expandedReports} toggleReport={toggleReport} />
      ) : (
        <TopicSummary days={topicDays} setTopicDays={setTopicDays} />
      )}
    </div>
  );
}

function DateReports({ reports, expandedReports, toggleReport }: {
  reports: ReportData[];
  expandedReports: Record<string, boolean>;
  toggleReport: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Run analysis button */}
      <button className="flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-accent to-purple-500 text-white rounded-2xl hover:shadow-lg hover:shadow-accent/25 transition-all text-sm font-semibold">
        <Zap className="w-5 h-5" /> 运行今日分析
      </button>

      {reports.map((report) => (
        <div key={report.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <button
            onClick={() => toggleReport(report.id)}
            className="w-full flex items-center justify-between px-7 py-6 hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-accent" />
              </div>
              <span className="font-bold text-base">{report.date} · 选题报告</span>
              <span className="text-sm text-gray-400">({report.itemCount} 条内容分析)</span>
            </div>
            {expandedReports[report.id] ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedReports[report.id] && (
            <div className="px-7 pb-7 space-y-8">
              {/* Hot topics */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 mb-4 tracking-widest uppercase">昨日热点回顾</h4>
                <div className="space-y-3">
                  {report.hotTopics.map((ht, i) => (
                    <div key={i} className="flex items-start gap-4 bg-gray-50/80 rounded-xl p-5">
                      <span className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-bold text-sm shrink-0 mt-0.5">{i + 1}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold">{ht.title}</span>
                          <span className="text-orange-500 text-xs font-bold">{ht.growth}</span>
                        </div>
                        <p className="text-sm text-gray-400 mt-2 leading-relaxed">{ht.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 mb-4 tracking-widest uppercase">选题建议</h4>
                <div className="space-y-4">
                  {report.suggestions.map((s, i) => (
                    <div key={i} className="bg-gray-50/80 rounded-xl p-6">
                      <h5 className="text-sm font-bold text-accent mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> {s.title}
                      </h5>
                      <p className="text-sm text-gray-500 leading-relaxed">{s.brief}</p>
                      <div className="text-sm text-gray-400 mt-3">来源: {s.sources}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TopicSummary({ days, setTopicDays }: { days: 7 | 14 | 30; setTopicDays: (d: 7 | 14 | 30) => void }) {
  const allSuggestions = [
    { title: "AI建站工具实战指南", firstSeen: "4月7日", trend: "↑↑↑" as const, brief: "无代码工具讨论量周环比+62%，中小企业主需求旺盛，技术门槛持续降低。爆点：用户可当天看到成果，内容传播性强。增长空间：目标人群渗透率约35%，提升空间40%+。", sources: "4月7日/4月8日/4月9日报告" },
    { title: "AI IDE工具评测对比", firstSeen: "4月8日", trend: "↑↑" as const, brief: "Cursor与Claude Code对比成焦点，B站技术区播放量持续走高。爆点：工具选择争议性话题，天然引发讨论。增长空间：新手开发者群体庞大，选型需求旺盛。", sources: "4月8日/4月9日报告" },
    { title: "Vibe Coding入门指南", firstSeen: "4月9日", trend: "↑↑↑" as const, brief: "用自然语言编程概念热度爆发，用户对「说话写代码」既好奇又质疑。爆点：颠覆传统编程认知。增长空间：非技术人群对此类内容兴趣极高。", sources: "4月9日/4月10日报告" },
    { title: "AI编程提示词最佳实践", firstSeen: "4月7日", trend: "↑" as const, brief: "提示词工程是AI编程核心技能，用户需求明确。爆点：实用性强，收藏率高。增长空间：几乎所有AI编程用户都需要提示词技巧。", sources: "4月7日/4月8日报告" },
  ];

  return (
    <div className="space-y-6">
      {/* Time range selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400 font-medium">时间范围</span>
        <div className="h-6 w-px bg-gray-200" />
        {([7, 14, 30] as const).map((d) => (
          <button
            key={d}
            onClick={() => setTopicDays(d)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              days === d ? "bg-accent text-white shadow-lg shadow-accent/25" : "bg-white text-gray-400 hover:text-gray-600 hover:shadow-sm"
            }`}
          >
            近{d}天
          </button>
        ))}
      </div>

      {/* Topic cards */}
      <div className="space-y-4">
        {allSuggestions.map((topic, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-bold text-accent">{topic.title}</h3>
              <span className="text-orange-500 text-sm font-bold shrink-0 ml-4">{topic.trend}</span>
            </div>
            <div className="text-sm text-gray-400 mb-4 font-medium">首次出现: {topic.firstSeen}</div>
            <p className="text-sm text-gray-500 leading-relaxed">{topic.brief}</p>
            <div className="text-sm text-gray-400 mt-4">来源: {topic.sources}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
