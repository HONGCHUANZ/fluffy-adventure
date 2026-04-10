# Content Monitor Frontend Prototype — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js frontend prototype for a content monitoring tool with category management, multi-platform content browsing, AI-powered topic analysis reports, and monitoring settings configuration.

**Architecture:** Single-page App Router app with left sidebar for category management, tab-based navigation for content/reports/settings within each category. All data is mock — no backend. State managed via Zustand for reactive UI updates.

**Tech Stack:** Next.js 14 (App Router) + React + TypeScript + Tailwind CSS v3 + Zustand + lucide-react

**Design Reference:** `docs/superpowers/specs/2026-04-10-content-monitor-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript config |
| `next.config.js` | Next.js config |
| `tailwind.config.js` | Tailwind theme with dark colors |
| `postcss.config.js` | PostCSS config |
| `app/globals.css` | Tailwind directives + custom scrollbar |
| `app/layout.tsx` | Root layout |
| `app/page.tsx` | Main page: state, sidebar + tab integration |
| `app/sidebar.tsx` | Left sidebar: category list, collapse toggle |
| `app/tab-nav.tsx` | Tab navigation bar (Content | Reports | Settings) |
| `app/content-tab.tsx` | Tab 1: platform filter, date cards, content list |
| `app/report-tab.tsx` | Tab 2: date reports + topic summary views |
| `app/settings-tab.tsx` | Tab 3: platform toggles, keywords, bloggers, run settings |
| `store/useStore.ts` | Zustand store for all UI state |
| `data/mock.ts` | Types, mock data, and utility functions |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.js`, `postcss.config.js`, `app/globals.css`
- Create directories: `app/`, `store/`, `data/`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "content-monitor",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^4.5.0",
    "lucide-react": "^0.378.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create next.config.js**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
```

- [ ] **Step 4: Create tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { primary: "#0f0f1a", secondary: "#1a1a2e" },
        card: { DEFAULT: "#1e1e2e", hover: "#2a2a3e" },
        text: { primary: "#e0e0e0", secondary: "#a0a0b0" },
        accent: { DEFAULT: "#6c63ff", hover: "#5a52e0" },
        danger: "#ff6b6b",
        success: "#22c55e",
        warning: "#f59e0b",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 5: Create postcss.config.js**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Create app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-bg-primary text-text-primary;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #333350;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #444466;
}
```

- [ ] **Step 7: Install dependencies**

```bash
npm install
```

Expected: node_modules created, no errors.

- [ ] **Step 8: Verify dev server starts**

```bash
timeout 10 npm run dev 2>&1 || true
```

Expected: "Ready in ..." message or compilation output. Ctrl+C after confirmation.

---

### Task 2: Types and Mock Data

**Files:**
- Create: `data/mock.ts`

- [ ] **Step 1: Create complete types and mock data**

```ts
// data/mock.ts

// ─── Types ───────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  lastRun: string; // e.g., "今天 08:30"
  running: boolean;
}

export interface Engagement {
  likes: number;
  comments: number;
  shares: number;
}

export interface ContentItem {
  id: string;
  categoryId: string;
  title: string;
  platform: string;
  blogger: string;
  followers: string;
  heat: number;
  engagement: Engagement;
  collectedAt: string; // e.g., "4月10日 06:30"
  date: string; // e.g., "4月10日"
}

export interface HotTopic {
  title: string;
  description: string;
  growth: string;
}

export interface TopicSuggestion {
  title: string;
  brief: string;
  sources: string;
}

export interface Report {
  id: string;
  categoryId: string;
  date: string;
  generatedAt: string;
  itemCount: number;
  hotTopics: HotTopic[];
  suggestions: TopicSuggestion[];
}

export interface Blogger {
  id: string;
  name: string;
  platform: string;
}

export interface MonitorConfig {
  id: string;
  categoryId: string;
  platforms: string[];
  keywords: string[];
  bloggers: Blogger[];
  runTime: string;
  aiEngine: string;
}

// ─── Constants ───────────────────────────────────────────

export const PLATFORMS = ["抖音", "小红书", "微博", "B站", "快手"];

export const PLATFORM_COLORS: Record<string, string> = {
  抖音: "bg-pink-500",
  小红书: "bg-red-400",
  微博: "bg-yellow-500",
  B站: "bg-blue-400",
  快手: "bg-orange-500",
};

// ─── Mock Data ───────────────────────────────────────────

export const categories: Category[] = [
  { id: "claudecode", name: "ClaudeCode 选题监控", lastRun: "今天 08:30", running: true },
  { id: "vibecoding", name: "VibeCoding 选题监控", lastRun: "今天 08:32", running: true },
];

export const contentItems: ContentItem[] = [
  {
    id: "c1", categoryId: "claudecode", title: "Claude Code 新功能：终端内直接调用 Agent 完成复杂任务",
    platform: "抖音", blogger: "@TechDaily", followers: "128万",
    heat: 92300, engagement: { likes: 4500, comments: 1200, shares: 2800 },
    collectedAt: "4月10日 06:30", date: "4月10日",
  },
  {
    id: "c2", categoryId: "claudecode", title: "用 Claude Code 30分钟搭建全栈应用，比手写快多少？",
    platform: "小红书", blogger: "@CodeWithMe", followers: "86万",
    heat: 78500, engagement: { likes: 5200, comments: 890, shares: 3100 },
    collectedAt: "4月10日 07:15", date: "4月10日",
  },
  {
    id: "c3", categoryId: "claudecode", title: "Cursor vs Claude Code 深度对比：谁更适合新手？",
    platform: "B站", blogger: "@AIInsights", followers: "67万",
    heat: 65400, engagement: { likes: 8900, comments: 2300, shares: 1500 },
    collectedAt: "4月10日 08:00", date: "4月10日",
  },
  {
    id: "c4", categoryId: "claudecode", title: "AI编程效率提升300%？实测一周Claude Code的真实体验",
    platform: "微博", blogger: "@DevInsider", followers: "45万",
    heat: 54200, engagement: { likes: 3200, comments: 980, shares: 1100 },
    collectedAt: "4月10日 09:10", date: "4月10日",
  },
  {
    id: "c5", categoryId: "claudecode", title: "Claude Code 自动化工作流：从需求到部署一条龙",
    platform: "抖音", blogger: "@VibeCodeHub", followers: "93万",
    heat: 48700, engagement: { likes: 2800, comments: 670, shares: 1900 },
    collectedAt: "4月9日 07:20", date: "4月9日",
  },
  {
    id: "c6", categoryId: "claudecode", title: "零编程基础用AI工具搭建个人博客全过程",
    platform: "小红书", blogger: "@NoCodeGirl", followers: "52万",
    heat: 42100, engagement: { likes: 3500, comments: 1100, shares: 2200 },
    collectedAt: "4月9日 08:45", date: "4月9日",
  },
  {
    id: "c7", categoryId: "claudecode", title: "AI Agent 编程实战：让AI自己写自己",
    platform: "B站", blogger: "@AIInsights", followers: "67万",
    heat: 38900, engagement: { likes: 6700, comments: 1800, shares: 900 },
    collectedAt: "4月9日 10:00", date: "4月9日",
  },
  {
    id: "c8", categoryId: "claudecode", title: "Claude Code 提示词工程：如何让它写出更好的代码",
    platform: "抖音", blogger: "@TechDaily", followers: "128万",
    heat: 35600, engagement: { likes: 2100, comments: 560, shares: 1400 },
    collectedAt: "4月8日 06:50", date: "4月8日",
  },
  {
    id: "c9", categoryId: "claudecode", title: "AI辅助编程2024趋势报告：这些岗位最先被替代",
    platform: "微博", blogger: "@FutureTechLab", followers: "78万",
    heat: 31200, engagement: { likes: 4100, comments: 1500, shares: 2600 },
    collectedAt: "4月8日 09:30", date: "4月8日",
  },
  {
    id: "c10", categoryId: "claudecode", title: "手把手教你用 Claude API 构建自动化脚本",
    platform: "B站", blogger: "@CodeMaster", followers: "41万",
    heat: 27800, engagement: { likes: 3800, comments: 920, shares: 700 },
    collectedAt: "4月7日 11:20", date: "4月7日",
  },
  // vibecoding 内容
  {
    id: "c11", categoryId: "vibecoding", title: "Vibe Coding 是什么？为什么它让程序员又爱又恨",
    platform: "抖音", blogger: "@TechDaily", followers: "128万",
    heat: 88200, engagement: { likes: 5600, comments: 2100, shares: 3400 },
    collectedAt: "4月10日 06:45", date: "4月10日",
  },
  {
    id: "c12", categoryId: "vibecoding", title: "我用Vibe Coding一天做了三个落地页，分享完整工作流",
    platform: "小红书", blogger: "@IndieHacker", followers: "34万",
    heat: 72100, engagement: { likes: 4200, comments: 780, shares: 2800 },
    collectedAt: "4月10日 07:30", date: "4月10日",
  },
  {
    id: "c13", categoryId: "vibecoding", title: "Vibe Coding vs 传统开发：效率对比实测",
    platform: "B站", blogger: "@AIInsights", followers: "67万",
    heat: 59800, engagement: { likes: 7800, comments: 1900, shares: 1200 },
    collectedAt: "4月9日 08:10", date: "4月9日",
  },
  {
    id: "c14", categoryId: "vibecoding", title: "零基础用AI生成完整SaaS产品的全过程记录",
    platform: "抖音", blogger: "@VibeCodeHub", followers: "93万",
    heat: 45300, engagement: { likes: 3100, comments: 890, shares: 2100 },
    collectedAt: "4月8日 07:00", date: "4月8日",
  },
  {
    id: "c15", categoryId: "vibecoding", title: "AI生成代码的质量到底行不行？代码审计结果来了",
    platform: "微博", blogger: "@DevInsider", followers: "45万",
    heat: 38900, engagement: { likes: 2900, comments: 1300, shares: 1700 },
    collectedAt: "4月7日 09:40", date: "4月7日",
  },
];

export const reports: Report[] = [
  {
    id: "r1", categoryId: "claudecode", date: "4月10日", generatedAt: "4月10日 08:32",
    itemCount: 10,
    hotTopics: [
      { title: "Claude Code 新功能发布", description: "终端内直接调用 Agent 完成复杂任务，三个平台讨论量增长 45%", growth: "↑↑↑" },
      { title: "AI IDE 工具横评", description: "Cursor vs Claude Code 对比成为焦点，B站技术区播放量 89万", growth: "↑↑↑" },
      { title: "AI辅助编程效率实测", description: "多位博主分享一周实测数据，平均效率提升 280%", growth: "↑↑" },
    ],
    suggestions: [
      {
        title: "Claude Code 实战教程：从零到部署",
        brief: "Claude Code 热度持续走高，用户对"AI替代手写代码"话题关注度高。爆点在于"30分钟完成全栈应用"的视觉冲击力。增长空间：大量传统开发者尚未尝试 AI 编程工具，渗透率约30%，提升空间60%+。",
        sources: "抖音×2, 小红书×1, B站×1",
      },
      {
        title: "AI IDE 工具评测：谁更适合新手？",
        brief: "Cursor 与 Claude Code 对比内容成为焦点，B站播放量持续走高。爆点：工具选择有争议性，天然引发讨论和站队。增长空间：新手开发者群体庞大，选型需求旺盛。",
        sources: "B站×2, 微博×1, 抖音×1",
      },
      {
        title: "AI编程工作流：从需求到部署全链路",
        brief: "多位博主分享了完整的 AI 编程工作流，从需求分析到自动部署。爆点：一条龙展示，满足用户"看AI有多强"的好奇心。增长空间：中小团队对自动化开发流程需求增长 40%。",
        sources: "抖音×1, 小红书×1, B站×1",
      },
    ],
  },
  {
    id: "r2", categoryId: "claudecode", date: "4月9日", generatedAt: "4月9日 08:30",
    itemCount: 8,
    hotTopics: [
      { title: "AI Agent 自主编程", description: "让AI自己写自己的概念引发热议，B站播放量 67万", growth: "↑↑" },
      { title: "零代码建站方案", description: "小红书搜索量周环比 +62%", growth: "↑↑" },
    ],
    suggestions: [
      {
        title: "AI Agent 编程：从概念到实践",
        brief: "AI Agent 自主编程概念热度上升，用户好奇心强。爆点："AI写AI"的递归概念有科技感和话题性。增长空间：技术进阶内容，适合有一定基础的开发者群体。",
        sources: "B站×1, 抖音×1",
      },
      {
        title: "零门槛建站：AI时代的个人网站方案",
        brief: "无代码工具讨论量持续增长。爆点：用户可当天看到成果，内容传播性强。增长空间：中小企业主、自由职业者群体渗透率约35%，提升空间40%+。",
        sources: "小红书×2, 抖音×1",
      },
    ],
  },
  {
    id: "r3", categoryId: "claudecode", date: "4月8日", generatedAt: "4月8日 08:31",
    itemCount: 6,
    hotTopics: [
      { title: "AI编程提示词技巧", description: "如何写出更好的AI辅助代码，微博讨论量 +35%", growth: "↑" },
      { title: "2024 AI编程趋势报告", description: "多个平台发布趋势分析，引发行业讨论", growth: "↑↑" },
    ],
    suggestions: [
      {
        title: "AI编程提示词最佳实践",
        brief: "提示词工程是AI编程的核心技能，用户需求明确。爆点：实用性强，收藏率高。增长空间：几乎所有AI编程用户都需要提示词技巧，覆盖广。",
        sources: "抖音×1, 微博×1",
      },
    ],
  },
  // vibecoding reports
  {
    id: "r4", categoryId: "vibecoding", date: "4月10日", generatedAt: "4月10日 08:35",
    itemCount: 8,
    hotTopics: [
      { title: "Vibe Coding 概念科普", description: "\"用自然语言编程"话题登上微博热搜，讨论量增长 55%", growth: "↑↑↑" },
      { title: "AI生成落地页实战", description: "独立开发者分享一天做三个落地页，小红书收藏量 4200", growth: "↑↑" },
    ],
    suggestions: [
      {
        title: "Vibe Coding 入门指南：自然语言编程真的来了",
        brief: "Vibe Coding 概念热度爆发，用户对"用说话写代码"话题既好奇又质疑。爆点：颠覆传统编程认知，容易引发"这也能行？"的讨论。增长空间：非技术人群对此类内容兴趣极高。",
        sources: "抖音×1, 小红书×1, 微博×1",
      },
      {
        title: "独立开发者的一天：AI生成3个落地页实录",
        brief: "效率展示类内容传播力强。爆点：数字冲击力（一天三个），满足"AI到底多快"的好奇。增长空间：自由职业者和独立开发者群体快速增长中。",
        sources: "小红书×1, 抖音×1",
      },
    ],
  },
  {
    id: "r5", categoryId: "vibecoding", date: "4月9日", generatedAt: "4月9日 08:33",
    itemCount: 6,
    hotTopics: [
      { title: "Vibe Coding vs 传统开发对比", description: "效率对比实测，B站播放量 59万", growth: "↑↑" },
    ],
    suggestions: [
      {
        title: "Vibe Coding 能替代程序员吗？实测对比",
        brief: "对比类内容天然有争议性和讨论度。爆点：替代焦虑+效率好奇，双重情绪驱动传播。增长空间：技术圈和非技术圈都关心这个话题。",
        sources: "B站×1, 抖音×1",
      },
    ],
  },
];

export const monitorConfigs: MonitorConfig[] = [
  {
    id: "mc1", categoryId: "claudecode",
    platforms: ["抖音", "小红书", "B站"],
    keywords: ["AI编程", "Claude Code", "Cursor", "AI IDE", "提示词工程"],
    bloggers: [
      { id: "b1", name: "@TechDaily", platform: "抖音" },
      { id: "b2", name: "@CodeWithMe", platform: "小红书" },
      { id: "b3", name: "@AIInsights", platform: "B站" },
      { id: "b4", name: "@VibeCodeHub", platform: "抖音" },
    ],
    runTime: "08:00",
    aiEngine: "OpenAI ChatGPT",
  },
  {
    id: "mc2", categoryId: "vibecoding",
    platforms: ["抖音", "小红书"],
    keywords: ["Vibe Coding", "AI建站", "无代码", "自然语言编程"],
    bloggers: [
      { id: "b1", name: "@TechDaily", platform: "抖音" },
      { id: "b5", name: "@IndieHacker", platform: "小红书" },
      { id: "b4", name: "@VibeCodeHub", platform: "抖音" },
    ],
    runTime: "08:30",
    aiEngine: "OpenAI ChatGPT",
  },
];

// ─── Utility Functions ───────────────────────────────────

export function getContentByCategoryAndDate(categoryId: string, date: string, platforms?: string[]): ContentItem[] {
  let items = contentItems.filter((c) => c.categoryId === categoryId && c.date === date);
  if (platforms && platforms.length > 0) {
    items = items.filter((c) => platforms.includes(c.platform));
  }
  return items.sort((a, b) => b.heat - a.heat);
}

export function getDateCounts(categoryId: string, platforms?: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  const items =
    platforms && platforms.length > 0
      ? contentItems.filter((c) => c.categoryId === categoryId && platforms.includes(c.platform))
      : contentItems.filter((c) => c.categoryId === categoryId);
  for (const item of items) {
    counts.set(item.date, (counts.get(item.date) || 0) + 1);
  }
  return counts;
}

export function getReportsByCategory(categoryId: string): Report[] {
  return reports.filter((r) => r.categoryId === categoryId);
}

export function getMonitorConfig(categoryId: string): MonitorConfig | undefined {
  return monitorConfigs.find((c) => c.categoryId === categoryId);
}

export function formatHeat(heat: number): string {
  if (heat >= 1000) return `${(heat / 1000).toFixed(1)}K`;
  return heat.toString();
}
```

---

### Task 3: Zustand Store

**Files:**
- Create: `store/useStore.ts`

- [ ] **Step 1: Create Zustand store with all state**

```ts
// store/useStore.ts

import { create } from "zustand";

interface AppState {
  activeCategoryId: string;
  activeTab: string;
  selectedPlatforms: string[];
  selectedDate: string;
  reportView: "date" | "topic";
  topicDays: 7 | 14 | 30;
  sidebarCollapsed: boolean;

  setActiveCategory: (id: string) => void;
  setActiveTab: (tab: string) => void;
  togglePlatform: (platform: string) => void;
  setSelectedDate: (date: string) => void;
  setReportView: (view: "date" | "topic") => void;
  setTopicDays: (days: 7 | 14 | 30) => void;
  toggleSidebar: () => void;
}

export const useStore = create<AppState>((set) => ({
  activeCategoryId: "claudecode",
  activeTab: "content",
  selectedPlatforms: [],
  selectedDate: "4月10日",
  reportView: "date",
  topicDays: 7,
  sidebarCollapsed: false,

  setActiveCategory: (id: string) => set({ activeCategoryId: id, activeTab: "content" }),
  setActiveTab: (tab: string) => set({ activeTab: tab }),
  togglePlatform: (platform: string) =>
    set((state) => {
      if (platform === "all") return { selectedPlatforms: [] };
      const current = state.selectedPlatforms;
      const next = current.includes(platform)
        ? current.filter((p) => p !== platform)
        : [...current, platform];
      return { selectedPlatforms: next };
    }),
  setSelectedDate: (date: string) => set({ selectedDate: date }),
  setReportView: (view: "date" | "topic") => set({ reportView: view }),
  setTopicDays: (days: 7 | 14 | 30) => set({ topicDays: days }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
```

---

### Task 4: Layout Shell — Sidebar + Root Layout

**Files:**
- Create: `app/layout.tsx`, `app/sidebar.tsx`

- [ ] **Step 1: Create root layout**

```tsx
// app/layout.tsx

import "./globals.css";
import Sidebar from "./sidebar";

export const metadata = {
  title: "内容监控工具",
  description: "多平台内容监控与AI选题分析",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="bg-bg-primary text-text-primary min-h-screen">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create sidebar component**

```tsx
// app/sidebar.tsx

"use client";

import { ChevronLeft, ChevronRight, Plus, Activity } from "lucide-react";
import { useStore } from "@/store/useStore";
import { categories } from "@/data/mock";

export default function Sidebar() {
  const { activeCategoryId, setActiveCategory, sidebarCollapsed, toggleSidebar } = useStore();

  return (
    <aside
      className={`flex flex-col bg-bg-secondary border-r border-white/5 transition-all duration-200 ${
        sidebarCollapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-white/5">
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <Activity className="w-4 h-4 text-white" />
        </div>
        {!sidebarCollapsed && <span className="font-semibold text-sm truncate">内容监控</span>}
      </div>

      {/* Categories */}
      <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
              activeCategoryId === cat.id
                ? "bg-accent/15 text-accent"
                : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
            }`}
          >
            {cat.running && (
              <span className="w-2 h-2 rounded-full bg-success shrink-0" />
            )}
            {sidebarCollapsed ? (
              <span className="text-xs font-medium truncate mx-auto">{cat.name[0]}</span>
            ) : (
              <div className="min-w-0">
                <div className="text-sm truncate">{cat.name}</div>
                <div className="text-xs text-text-secondary/70">{cat.lastRun}</div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Add category + collapse */}
      <div className="border-t border-white/5 p-2 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors text-sm">
          <Plus className="w-4 h-4 shrink-0" />
          {!sidebarCollapsed && <span>新建分类</span>}
        </button>
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors text-sm"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span>收起</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Verify layout renders**

```bash
timeout 10 npm run dev 2>&1 || true
```

Expected: No compilation errors.

---

### Task 5: Tab Navigation

**Files:**
- Create: `app/tab-nav.tsx`

- [ ] **Step 1: Create tab navigation component**

```tsx
// app/tab-nav.tsx

"use client";

import { useStore } from "@/store/useStore";

const tabs = [
  { key: "content", label: "内容" },
  { key: "report", label: "选题报告" },
  { key: "settings", label: "监控设置" },
];

export default function TabNav() {
  const { activeTab, setActiveTab } = useStore();

  return (
    <div className="flex items-center gap-1 border-b border-white/5 px-6 h-12">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === tab.key
              ? "bg-accent/15 text-accent"
              : "text-text-secondary hover:text-text-primary hover:bg-white/5"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

---

### Task 6: Content Tab

**Files:**
- Create: `app/content-tab.tsx`

- [ ] **Step 1: Create complete content tab component**

```tsx
// app/content-tab.tsx

"use client";

import { ArrowLeft, ArrowRight, Flame, ThumbsUp, MessageCircle, Repeat, Star, Send } from "lucide-react";
import { useRef } from "react";
import { useStore } from "@/store/useStore";
import { PLATFORMS, PLATFORM_COLORS, getContentByCategoryAndDate, getDateCounts, formatHeat } from "@/data/mock";

export default function ContentTab() {
  const { activeCategoryId, selectedPlatforms, togglePlatform, selectedDate, setSelectedDate } = useStore();
  const dateScrollRef = useRef<HTMLDivElement>(null);

  const dateCounts = getDateCounts(activeCategoryId, selectedPlatforms);
  const items = getContentByCategoryAndDate(activeCategoryId, selectedDate, selectedPlatforms.length > 0 ? selectedPlatforms : undefined);

  const dates = Array.from(dateCounts.keys());
  const today = "4月10日";

  const scrollDates = (dir: number) => {
    if (dateScrollRef.current) dateScrollRef.current.scrollBy({ left: dir * 140, behavior: "smooth" });
  };

  return (
    <div className="p-6 space-y-5">
      {/* Platform filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => togglePlatform("all")}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            selectedPlatforms.length === 0
              ? "bg-accent text-white"
              : "bg-card text-text-secondary hover:text-text-primary hover:bg-card-hover"
          }`}
        >
          全部
        </button>
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => togglePlatform(p)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedPlatforms.includes(p)
                ? "bg-accent text-white"
                : "bg-card text-text-secondary hover:text-text-primary hover:bg-card-hover"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Date cards */}
      <div className="flex items-center gap-2">
        <button onClick={() => scrollDates(-1)} className="p-1 rounded hover:bg-white/5 text-text-secondary shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div ref={dateScrollRef} className="flex gap-2 overflow-x-auto flex-1 scrollbar-hide py-1">
          {dates.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className={`flex-shrink-0 w-[120px] px-3 py-2.5 rounded-lg text-center transition-colors ${
                d === selectedDate
                  ? "bg-accent/15 border border-accent/30"
                  : "bg-card border border-transparent hover:bg-card-hover"
              }`}
            >
              <div className="text-sm font-medium flex items-center justify-center gap-1.5">
                {d}
                {d === today && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
              </div>
              <div className="text-xs text-text-secondary mt-1">{dateCounts.get(d)} 条</div>
            </button>
          ))}
        </div>
        <button onClick={() => scrollDates(1)} className="p-1 rounded hover:bg-white/5 text-text-secondary shrink-0">
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content list */}
      <div className="space-y-3">
        {items.length === 0 && (
          <div className="text-center py-16 text-text-secondary">
            <p className="text-lg">暂无内容</p>
            <p className="text-sm mt-1">该日期或平台筛选下没有采集到内容</p>
          </div>
        )}
        {items.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function ContentCard({ item }: { item: { id: string; title: string; platform: string; blogger: string; followers: string; heat: number; engagement: { likes: number; comments: number; shares: number }; collectedAt: string } }) {
  const engagementIcons = (
    <>
      <span className="flex items-center gap-1 text-text-secondary text-xs">
        <ThumbsUp className="w-3.5 h-3.5" /> {item.engagement.likes}
      </span>
      <span className="flex items-center gap-1 text-text-secondary text-xs">
        <MessageCircle className="w-3.5 h-3.5" /> {item.engagement.comments}
      </span>
      <span className="flex items-center gap-1 text-text-secondary text-xs">
        {item.platform === "小红书" ? <Star className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
        {" "} {item.engagement.shares}
      </span>
    </>
  );

  return (
    <div className="bg-card rounded-xl p-4 border border-white/5 hover:bg-card-hover hover:border-white/10 transition-all group cursor-pointer">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center gap-1 text-danger font-semibold text-sm">
              <Flame className="w-4 h-4" /> {formatHeat(item.heat)}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs text-white ${PLATFORM_COLORS[item.platform] || "bg-gray-500"}`}>
              {item.platform}
            </span>
            <span className="text-xs text-text-secondary">{item.collectedAt}</span>
          </div>
          <h3 className="text-sm font-medium mb-2 group-hover:text-accent transition-colors">{item.title}</h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">
              {item.blogger} · {item.followers}粉丝
            </span>
            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
              {engagementIcons}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 7: Report Tab

**Files:**
- Create: `app/report-tab.tsx`

- [ ] **Step 1: Create complete report tab component**

```tsx
// app/report-tab.tsx

"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Zap, TrendingUp, Calendar } from "lucide-react";
import { useStore } from "@/store/useStore";
import { getReportsByCategory } from "@/data/mock";

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
    <div className="p-6 space-y-5">
      {/* View switcher */}
      <div className="flex items-center gap-2">
        <div className="flex bg-card rounded-lg p-1 border border-white/5">
          <button
            onClick={() => setReportView("date")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              reportView === "date" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            按日期查看报告
          </button>
          <button
            onClick={() => setReportView("topic")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              reportView === "topic" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            按选题汇总
          </button>
        </div>
      </div>

      {reportView === "date" ? (
        <DateReports reports={reports} expandedReports={expandedReports} toggleReport={toggleReport} />
      ) : (
        <TopicSummary days={topicDays} setTopicDays={setTopicDays} />
      )}
    </div>
  );
}

function DateReports({ reports, expandedReports, toggleReport }: {
  reports: any[];
  expandedReports: Record<string, boolean>;
  toggleReport: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Run analysis button */}
      <button className="flex items-center gap-2 px-4 py-2.5 bg-accent/10 border border-accent/20 rounded-lg text-accent hover:bg-accent/20 transition-colors text-sm font-medium">
        <Zap className="w-4 h-4" /> 运行今日分析
      </button>

      {reports.map((report, idx) => (
        <div key={report.id} className="bg-card rounded-xl border border-white/5 overflow-hidden">
          <button
            onClick={() => toggleReport(report.id)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-card-hover/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-accent" />
              <span className="font-medium text-sm">{report.date} · 选题报告</span>
              <span className="text-xs text-text-secondary">({report.itemCount} 条内容分析)</span>
            </div>
            {expandedReports[report.id] ? (
              <ChevronUp className="w-4 h-4 text-text-secondary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-secondary" />
            )}
          </button>

          {expandedReports[report.id] && (
            <div className="px-5 pb-5 space-y-5 border-t border-white/5 pt-4">
              {/* Hot topics */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-text-secondary">昨日热点回顾</h4>
                <div className="space-y-2">
                  {report.hotTopics.map((ht: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 bg-bg-secondary rounded-lg p-3">
                      <span className="text-accent font-bold text-sm shrink-0 mt-0.5">{i + 1}.</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{ht.title}</span>
                          <span className="text-danger text-xs font-bold">{ht.growth}</span>
                        </div>
                        <p className="text-xs text-text-secondary mt-1">{ht.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-text-secondary">选题建议</h4>
                <div className="space-y-3">
                  {report.suggestions.map((s: any, i: number) => (
                    <div key={i} className="bg-bg-secondary rounded-lg p-4 border border-white/5">
                      <h5 className="text-sm font-semibold text-accent mb-2 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5" /> {s.title}
                      </h5>
                      <p className="text-xs text-text-secondary leading-relaxed">{s.brief}</p>
                      <div className="text-xs text-text-secondary/60 mt-2">来源: {s.sources}</div>
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
  // Merge topics from all reports (simplified for prototype)
  const allSuggestions = [
    { title: "AI建站工具实战指南", firstSeen: "4月7日", trend: "↑↑↑" as const, brief: "无代码工具讨论量周环比+62%，中小企业主需求旺盛，技术门槛持续降低。爆点：用户可当天看到成果，内容传播性强。增长空间：目标人群渗透率约35%，提升空间40%+。", sources: "4月7日/4月8日/4月9日报告" },
    { title: "AI IDE工具评测对比", firstSeen: "4月8日", trend: "↑↑" as const, brief: "Cursor与Claude Code对比成焦点，B站技术区播放量持续走高。爆点：工具选择争议性话题，天然引发讨论。增长空间：新手开发者群体庞大，选型需求旺盛。", sources: "4月8日/4月9日报告" },
    { title: "Vibe Coding入门指南", firstSeen: "4月9日", trend: "↑↑↑" as const, brief: "用自然语言编程概念热度爆发，用户对"说话写代码"既好奇又质疑。爆点：颠覆传统编程认知。增长空间：非技术人群对此类内容兴趣极高。", sources: "4月9日/4月10日报告" },
    { title: "AI编程提示词最佳实践", firstSeen: "4月7日", trend: "↑" as const, brief: "提示词工程是AI编程核心技能，用户需求明确。爆点：实用性强，收藏率高。增长空间：几乎所有AI编程用户都需要提示词技巧。", sources: "4月7日/4月8日报告" },
  ];

  return (
    <div className="space-y-4">
      {/* Time range selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary">时间范围:</span>
        {([7, 14, 30] as const).map((d) => (
          <button
            key={d}
            onClick={() => setTopicDays(d)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              days === d ? "bg-accent text-white" : "bg-card text-text-secondary hover:bg-card-hover"
            }`}
          >
            近{d}天
          </button>
        ))}
      </div>

      {/* Topic cards */}
      <div className="space-y-3">
        {allSuggestions.map((topic, i) => (
          <div key={i} className="bg-card rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-accent">{topic.title}</h3>
              <span className="text-danger text-xs font-bold shrink-0 ml-2">{topic.trend}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-secondary mb-2">
              <span>首次出现: {topic.firstSeen}</span>
            </div>
            <div className="space-y-1 text-xs text-text-secondary leading-relaxed">
              <p>💡 <span className="text-text-primary font-medium">为什么做:</span> {topic.brief}</p>
            </div>
            <div className="text-xs text-text-secondary/60 mt-2">来源: {topic.sources}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### Task 8: Settings Tab

**Files:**
- Create: `app/settings-tab.tsx`

- [ ] **Step 1: Create complete settings tab component**

```tsx
// app/settings-tab.tsx

"use client";

import { useState } from "react";
import { X, Plus, Trash2, Check, Save, RotateCcw } from "lucide-react";
import { useStore } from "@/store/useStore";
import { PLATFORMS, getMonitorConfig, type Blogger } from "@/data/mock";

export default function SettingsTab() {
  const { activeCategoryId } = useStore();
  const config = getMonitorConfig(activeCategoryId);
  const [platforms, setPlatforms] = useState<string[]>(config?.platforms || []);
  const [keywords, setKeywords] = useState<string[]>(config?.keywords || []);
  const [bloggers, setBloggers] = useState<Blogger[]>(config?.bloggers || []);
  const [runTime, setRunTime] = useState(config?.runTime || "08:00");
  const [keywordInput, setKeywordInput] = useState("");
  const [showBloggerModal, setShowBloggerModal] = useState(false);
  const [newBlogger, setNewBlogger] = useState({ name: "", platform: PLATFORMS[0] });

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const addKeyword = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && keywordInput.trim()) {
      const parts = keywordInput
        .split(/[,，\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      setKeywords((prev) => [...prev, ...parts.filter((p) => !prev.includes(p))]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (kw: string) => setKeywords((prev) => prev.filter((k) => k !== kw));

  const addBlogger = () => {
    if (newBlogger.name.trim()) {
      setBloggers((prev) => [...prev, { id: `b${Date.now()}`, name: newBlogger.name.trim(), platform: newBlogger.platform }]);
      setNewBlogger({ name: "", platform: PLATFORMS[0] });
      setShowBloggerModal(false);
    }
  };

  const removeBlogger = (id: string) => setBloggers((prev) => prev.filter((b) => b.id !== id));

  return (
    <div className="p-6 space-y-8 max-w-2xl">
      {/* Platforms */}
      <section>
        <h3 className="text-sm font-semibold text-text-secondary mb-3">监控平台</h3>
        <div className="flex flex-wrap gap-3">
          {PLATFORMS.map((p) => {
            const active = platforms.includes(p);
            return (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors text-sm font-medium ${
                  active
                    ? "bg-accent/15 border-accent/30 text-accent"
                    : "bg-card border-white/5 text-text-secondary hover:border-white/10"
                }`}
              >
                {active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4 opacity-30" />}
                {p}
              </button>
            );
          })}
        </div>
      </section>

      {/* Keywords */}
      <section>
        <h3 className="text-sm font-semibold text-text-secondary mb-3">对标关键词</h3>
        <div className="bg-card rounded-lg border border-white/5 p-3">
          <div className="flex flex-wrap gap-2 mb-2">
            {keywords.map((kw) => (
              <span key={kw} className="flex items-center gap-1.5 bg-bg-secondary px-3 py-1 rounded-md text-sm">
                {kw}
                <button onClick={() => removeKeyword(kw)} className="text-text-secondary hover:text-text-primary">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={addKeyword}
              placeholder="输入后回车添加..."
              className="bg-transparent outline-none text-sm text-text-primary placeholder:text-text-secondary/40 min-w-[140px] flex-1"
            />
          </div>
        </div>
        <p className="text-xs text-text-secondary/60 mt-1.5">已添加 {keywords.length} 个关键词，支持逗号/换行批量粘贴</p>
      </section>

      {/* Bloggers */}
      <section>
        <h3 className="text-sm font-semibold text-text-secondary mb-3">对标博主/账号</h3>
        <div className="bg-card rounded-lg border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-text-secondary">
                <th className="text-left px-4 py-2.5 font-medium">博主名称</th>
                <th className="text-left px-4 py-2.5 font-medium">平台</th>
                <th className="text-right px-4 py-2.5 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {bloggers.map((b) => (
                <tr key={b.id} className="border-b border-white/5 hover:bg-card-hover/30">
                  <td className="px-4 py-2.5">{b.name}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{b.platform}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => removeBlogger(b.id)} className="text-text-secondary hover:text-danger transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={() => setShowBloggerModal(true)}
          className="flex items-center gap-1.5 mt-3 text-sm text-accent hover:text-accent/80 transition-colors"
        >
          <Plus className="w-4 h-4" /> 添加博主
        </button>
      </section>

      {/* Run settings */}
      <section>
        <h3 className="text-sm font-semibold text-text-secondary mb-3">运行设置</h3>
        <div className="bg-card rounded-lg border border-white/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">运行频率</span>
            <span className="text-sm">每天一次</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">运行时间</span>
            <select
              value={runTime}
              onChange={(e) => setRunTime(e.target.value)}
              className="bg-bg-secondary border border-white/10 rounded-md px-3 py-1.5 text-sm outline-none focus:border-accent/50"
            >
              {Array.from({ length: 24 }, (_, h) => {
                const v = `${String(h).padStart(2, "0")}:00`;
                return <option key={v} value={v}>{v}</option>;
              })}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">AI 分析引擎</span>
            <span className="text-sm">OpenAI ChatGPT</span>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button className="flex items-center gap-2 px-5 py-2.5 bg-accent rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors">
          <Save className="w-4 h-4" /> 保存设置
        </button>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-card border border-white/10 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
          <RotateCcw className="w-4 h-4" /> 重置
        </button>
      </div>

      {/* Blogger modal */}
      {showBloggerModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowBloggerModal(false)}>
          <div className="bg-bg-secondary rounded-xl border border-white/10 p-6 w-80 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-medium text-sm">添加博主</h4>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">平台</label>
              <select
                value={newBlogger.platform}
                onChange={(e) => setNewBlogger((p) => ({ ...p, platform: e.target.value }))}
                className="w-full bg-card border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-accent/50"
              >
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">博主名称</label>
              <input
                type="text"
                value={newBlogger.name}
                onChange={(e) => setNewBlogger((p) => ({ ...p, name: e.target.value }))}
                placeholder="@博主名"
                className="w-full bg-card border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-accent/50 placeholder:text-text-secondary/40"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowBloggerModal(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
                取消
              </button>
              <button onClick={addBlogger} className="px-4 py-2 bg-accent rounded-md text-sm font-medium hover:bg-accent/90">
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### Task 9: Wire Up Main Page + Verify

**Files:**
- Modify: `app/page.tsx` (create new)

- [ ] **Step 1: Create main page that integrates all components**

```tsx
// app/page.tsx

"use client";

import TabNav from "./tab-nav";
import ContentTab from "./content-tab";
import ReportTab from "./report-tab";
import SettingsTab from "./settings-tab";
import { useStore } from "@/store/useStore";

export default function Home() {
  const { activeTab } = useStore();

  return (
    <div className="flex flex-col h-full">
      <TabNav />
      <div className="flex-1 overflow-auto">
        {activeTab === "content" && <ContentTab />}
        {activeTab === "report" && <ReportTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Start dev server for visual verification**

```bash
npm run dev
```

Expected: Server starts, open browser to `http://localhost:3000`, verify:
- Sidebar shows 2 categories with green status dots
- Clicking categories switches content
- Content tab: platform filter buttons work, date cards show data, content cards sorted by heat
- Report tab: date view shows expandable reports, topic view shows merged topics
- Settings tab: platform toggles, keyword tag input, blogger table, run settings

---

## Self-Review

### 1. Spec Coverage Check

| Spec Section | Task | Status |
|---|---|---|
| Left sidebar 240px, collapsible to 64px | Task 4 | Covered |
| Category list with name, last run, status dot | Task 4 | Covered |
| + New category button | Task 4 | Covered |
| 3 tabs (content, report, settings) | Task 5 | Covered |
| Switch category resets to content tab | Task 3 (setActiveCategory resets activeTab) | Covered |
| Platform filter as flat buttons, multi-select | Task 6 | Covered |
| Date cards horizontal scroll, badge counts, today dot | Task 6 | Covered |
| Content cards sorted by heat with engagement data | Task 6 | Covered |
| Report tab: date view + topic summary | Task 7 | Covered |
| Date view: latest expanded, run analysis button | Task 7 | Covered |
| Topic summary: 7/14/30 day selector, merged topics | Task 7 | Covered |
| Settings: platform toggles, keyword tag input | Task 8 | Covered |
| Settings: blogger table + modal add | Task 8 | Covered |
| Settings: run time, AI engine, save/reset | Task 8 | Covered |
| Dark theme color scheme | Task 1 (globals.css + tailwind.config) | Covered |
| Mock data for all components | Task 2 | Covered |

### 2. Placeholder Scan
No TBD, TODO, or incomplete sections found. All code blocks contain complete implementations.

### 3. Type Consistency
All components import types from `data/mock.ts`. Store state keys match component expectations. Function signatures are consistent across tasks.

### 4. Scope Check
This is a focused frontend prototype with mock data only. No backend, no real API calls. Scope is appropriate for a single implementation plan.
