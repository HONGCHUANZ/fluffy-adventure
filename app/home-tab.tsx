// app/home-tab.tsx

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useStore } from "@/store/useStore";
import {
  Sparkles, FileText, Clock, BarChart3, Settings,
  ArrowRight, TrendingUp, Database, Eye, Plus,
  Activity, AlertCircle, CheckCircle2, XCircle, Zap
} from "lucide-react";

// Animated wave line background
function WaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 0;
      canvas.height = canvas.parentElement?.clientHeight || 0;
    };
    resize();
    window.addEventListener("resize", resize);

    // Wave line definitions
    const waves = [
      { amplitude: 80, frequency: 0.003, speed: 0.0008, color: "rgba(139,92,246,0.06)", yOffset: 0.3 },
      { amplitude: 60, frequency: 0.004, speed: 0.0006, color: "rgba(99,102,241,0.05)", yOffset: 0.5 },
      { amplitude: 100, frequency: 0.002, speed: 0.001, color: "rgba(168,85,247,0.04)", yOffset: 0.7 },
      { amplitude: 50, frequency: 0.005, speed: 0.0004, color: "rgba(129,140,248,0.06)", yOffset: 0.2 },
      { amplitude: 70, frequency: 0.0035, speed: 0.0007, color: "rgba(192,132,252,0.05)", yOffset: 0.85 },
    ];

    // Floating dots along waves
    const dots: { waveIndex: number; phase: number; speed: number; size: number; color: string }[] = [];
    for (let i = 0; i < 20; i++) {
      dots.push({
        waveIndex: Math.floor(Math.random() * waves.length),
        phase: Math.random() * Math.PI * 2,
        speed: 0.002 + Math.random() * 0.003,
        size: 2 + Math.random() * 2,
        color: ["rgba(139,92,246,0.4)", "rgba(99,102,241,0.3)", "rgba(168,85,247,0.35)", "rgba(192,132,252,0.3)"][Math.floor(Math.random() * 4)],
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      waves.forEach((wave, wi) => {
        const baseY = canvas.height * wave.yOffset;

        // Draw wave line
        ctx.beginPath();
        ctx.moveTo(0, baseY);
        for (let x = 0; x <= canvas.width; x += 2) {
          const y = baseY + Math.sin(x * wave.frequency + time * wave.speed) * wave.amplitude
            + Math.sin(x * wave.frequency * 1.5 + time * wave.speed * 0.7) * wave.amplitude * 0.3;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Fill area below wave
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, baseY - wave.amplitude, 0, canvas.height);
        gradient.addColorStop(0, wave.color.replace(/[\d.]+\)$/, "0.02)"));
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      // Draw floating dots
      dots.forEach((dot) => {
        dot.phase += dot.speed;
        const wave = waves[dot.waveIndex];
        const baseY = canvas.height * wave.yOffset;
        const x = ((dot.phase * 100) % (canvas.width + 100)) - 50;
        const y = baseY + Math.sin(x * wave.frequency + time * wave.speed) * wave.amplitude
          + Math.sin(x * wave.frequency * 1.5 + time * wave.speed * 0.7) * wave.amplitude * 0.3;

        ctx.beginPath();
        ctx.arc(x, y, dot.size, 0, Math.PI * 2);
        ctx.fillStyle = dot.color;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(x, y, dot.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = dot.color.replace(/[\d.]+\)$/, "0.08)");
        ctx.fill();
      });

      time++;
      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none" }}
    />
  );
}

// Animated counter
function AnimatedCounter({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

// Orbiting ring decoration
function OrbitRing({ delay, size }: { delay: number; size: number }) {
  return (
    <div
      className="absolute rounded-full border border-purple-300/20"
      style={{
        width: size,
        height: size,
        animation: `spin ${20 + delay * 5}s linear infinite`,
        animationDelay: `${delay}s`,
      }}
    >
      <div
        className="absolute w-2 h-2 bg-purple-400/60 rounded-full"
        style={{ top: -4, left: "50%", transform: "translateX(-50%)" }}
      />
    </div>
  );
}

export default function HomeTab() {
  const { setActiveTab, activeCategoryId } = useStore();
  const [greeting, setGreeting] = useState("");
  const [subGreeting, setSubGreeting] = useState("");
  const [stats, setStats] = useState({
    categories: 0,
    totalContent: 0,
    totalRecords: 0,
    totalNew: 0,
    successRate: 0,
  });
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour < 6) {
      setGreeting("夜深了");
      setSubGreeting("还在为选题努力，辛苦啦");
    } else if (hour < 12) {
      setGreeting("上午好");
      setSubGreeting("新的一天，新的选题灵感");
    } else if (hour < 14) {
      setGreeting("中午好");
      setSubGreeting("午休时间，顺便看看数据");
    } else if (hour < 18) {
      setGreeting("下午好");
      setSubGreeting("专注创作，高效选题");
    } else {
      setGreeting("晚上好");
      setSubGreeting("一天的数据复盘时间");
    }
  }, []);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        setStats((s) => ({ ...s, categories: (data.categories || []).length }));
      });

    fetch(`/api/records?categoryId=${activeCategoryId}&limit=5`)
      .then((res) => res.json())
      .then((data) => {
        const records = data.records || [];
        const totalNew = records.reduce((sum: number, r: any) => sum + r.total_new, 0);
        const successCount = records.filter((r: any) => r.status === "success").length;
        setStats((s) => ({
          ...s,
          totalRecords: records.length,
          totalNew,
          successRate: records.length > 0 ? Math.round((successCount / records.length) * 100) : 0,
        }));
        setRecentRecords(records.slice(0, 5));
      });

    fetch(`/api/content?categoryId=${activeCategoryId}&date=&platforms=&mode=dates`)
      .then((res) => res.json())
      .then((data) => {
        const total = (data.dates || []).reduce((sum: number, d: any) => sum + d.count, 0);
        setStats((s) => ({ ...s, totalContent: total }));
      });
  }, [activeCategoryId]);

  const formatTime = (created: string) => {
    const d = new Date(created + "+08:00");
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const quickActions = [
    {
      label: "内容工厂",
      desc: "AI 多平台内容创作",
      icon: <Sparkles className="w-5 h-5" />,
      gradient: "from-purple-500 via-violet-500 to-indigo-600",
      shadow: "shadow-purple-200/50",
      hover: "hover:shadow-purple-300/60",
      onClick: () => setActiveTab("factory"),
    },
    {
      label: "内容浏览",
      desc: "查看采集到的内容",
      icon: <FileText className="w-5 h-5" />,
      gradient: "from-blue-500 via-cyan-500 to-teal-500",
      shadow: "shadow-blue-200/50",
      hover: "hover:shadow-blue-300/60",
      onClick: () => setActiveTab("content"),
    },
    {
      label: "选题报告",
      desc: "AI 分析选题趋势",
      icon: <BarChart3 className="w-5 h-5" />,
      gradient: "from-emerald-500 via-green-500 to-lime-500",
      shadow: "shadow-green-200/50",
      hover: "hover:shadow-green-300/60",
      onClick: () => setActiveTab("report"),
    },
    {
      label: "搜索记录",
      desc: "查看采集日志",
      icon: <Clock className="w-5 h-5" />,
      gradient: "from-orange-500 via-amber-500 to-yellow-500",
      shadow: "shadow-orange-200/50",
      hover: "hover:shadow-orange-300/60",
      onClick: () => setActiveTab("records"),
    },
    {
      label: "监控设置",
      desc: "配置分类与关键词",
      icon: <Settings className="w-5 h-5" />,
      gradient: "from-slate-500 via-gray-500 to-zinc-500",
      shadow: "shadow-gray-200/50",
      hover: "hover:shadow-gray-300/60",
      onClick: () => setActiveTab("settings"),
    },
  ];

  const statCards = [
    {
      label: "采集内容",
      value: stats.totalContent,
      icon: <Database className="w-5 h-5" />,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      label: "分类数量",
      value: stats.categories,
      icon: <Activity className="w-5 h-5" />,
      gradient: "from-green-500 to-emerald-500",
    },
    {
      label: "新增选题",
      value: stats.totalNew,
      icon: <TrendingUp className="w-5 h-5" />,
      gradient: "from-purple-500 to-indigo-500",
    },
    {
      label: "成功率",
      value: stats.successRate,
      suffix: "%",
      icon: <CheckCircle2 className="w-5 h-5" />,
      gradient: "from-pink-500 to-rose-500",
    },
  ];

  return (
    <div className="relative min-h-full bg-gradient-to-br from-slate-50 via-purple-50/30 to-white overflow-hidden">
      {/* Wave line background */}
      <WaveBackground />

      {/* Decorative orbs */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-purple-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-200/10 rounded-full blur-3xl" />

      <div className="relative z-10 p-8 space-y-8 max-w-6xl mx-auto">
        {/* Welcome header */}
        <div
          className={`space-y-2 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
              {greeting}
            </h1>
            <div
              className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"
              style={{ boxShadow: "0 0 8px rgba(74,222,128,0.6)" }}
            />
          </div>
          <p className="text-sm text-gray-400">{subGreeting}</p>
        </div>

        {/* Stats with stagger animation */}
        <div className="grid grid-cols-4 gap-5">
          {statCards.map((card, i) => (
            <div
              key={card.label}
              className={`group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border border-white/50 overflow-hidden ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: `${(i + 1) * 100}ms` }}
            >
              {/* Hover gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

              {/* Orbit decoration */}
              <div className="absolute top-3 right-3 opacity-20 group-hover:opacity-40 transition-opacity">
                <OrbitRing delay={i} size={40} />
              </div>

              <div className="relative">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white mb-4 shadow-lg`}
                  style={{ boxShadow: `0 4px 15px ${card.gradient.includes("purple") ? "rgba(168,85,247,0.3)" : card.gradient.includes("blue") ? "rgba(59,130,246,0.3)" : card.gradient.includes("green") ? "rgba(34,197,94,0.3)" : "rgba(236,72,153,0.3)"}` }}
                >
                  {card.icon}
                </div>
                <div className="text-2xl font-black text-gray-800 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-gray-800 group-hover:to-gray-600 transition-all">
                  <AnimatedCounter target={card.value} />{card.suffix || ""}
                </div>
                <div className="text-xs text-gray-400 mt-1 font-medium">{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`} style={{ transitionDelay: "400ms" }}>
          <h2 className="text-base font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            快捷入口
          </h2>
          <div className="grid grid-cols-5 gap-4">
            {quickActions.map((action, i) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className={`group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm ${action.hover} hover:shadow-xl hover:-translate-y-2 transition-all duration-500 text-left border border-white/50 overflow-hidden ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${500 + i * 80}ms` }}
              >
                {/* Animated background glow */}
                <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500`} />

                {/* Floating icon container */}
                <div className="relative mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}
                    style={{ transitionDelay: `${i * 30}ms` }}
                  >
                    {action.icon}
                  </div>
                </div>
                <div className="relative text-sm font-bold text-gray-700 group-hover:text-gray-900 transition-colors">{action.label}</div>
                <div className="relative text-xs text-gray-400 mt-1">{action.desc}</div>

                {/* Bottom accent line */}
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${action.gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
              </button>
            ))}
          </div>
        </div>

        {/* Recent records */}
        <div className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`} style={{ transitionDelay: "800ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-700 flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-500" />
              最近采集
            </h2>
            <button
              onClick={() => setActiveTab("records")}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-purple-500 transition-colors group/btn"
            >
              查看全部
              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
          {recentRecords.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 shadow-sm text-center border border-white/50">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3 animate-pulse" />
              <p className="text-sm text-gray-400">暂无采集记录</p>
              <p className="text-xs text-gray-300 mt-1">前往内容页面点击「快速更新」开始采集</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentRecords.map((record, i) => (
                <div
                  key={record.id}
                  className={`bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-sm border border-white/50 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
                  style={{ transitionDelay: `${900 + i * 100}ms` }}
                >
                  {record.status === "success" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  ) : record.status === "partial" ? (
                    <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700">{formatTime(record.created_at)}</span>
                      <span className="text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text text-transparent">+{record.total_new}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">
                      {JSON.parse(record.keywords || "[]").join(", ")} · {JSON.parse(record.platforms || "[]").join(", ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
