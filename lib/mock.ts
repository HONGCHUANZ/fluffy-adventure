// data/mock.ts

// ─── Types ───────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  lastRun: string;
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
  collectedAt: string;
  date: string;
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
        brief: "Claude Code 热度持续走高，用户对「AI替代手写代码」话题关注度高。爆点在于「30分钟完成全栈应用」的视觉冲击力。增长空间：大量传统开发者尚未尝试 AI 编程工具，渗透率约30%，提升空间60%+。",
        sources: "抖音×2, 小红书×1, B站×1",
      },
      {
        title: "AI IDE 工具评测：谁更适合新手？",
        brief: "Cursor 与 Claude Code 对比内容成为焦点，B站播放量持续走高。爆点：工具选择有争议性，天然引发讨论和站队。增长空间：新手开发者群体庞大，选型需求旺盛。",
        sources: "B站×2, 微博×1, 抖音×1",
      },
      {
        title: "AI编程工作流：从需求到部署全链路",
        brief: "多位博主分享了完整的 AI 编程工作流，从需求分析到自动部署。爆点：一条龙展示，满足用户「看AI有多强」的好奇心。增长空间：中小团队对自动化开发流程需求增长 40%。",
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
        brief: "AI Agent 自主编程概念热度上升，用户好奇心强。爆点：「AI写AI」的递归概念有科技感和话题性。增长空间：技术进阶内容，适合有一定基础的开发者群体。",
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
  {
    id: "r4", categoryId: "vibecoding", date: "4月10日", generatedAt: "4月10日 08:35",
    itemCount: 8,
    hotTopics: [
      { title: "Vibe Coding 概念科普", description: "「用自然语言编程」话题登上微博热搜，讨论量增长 55%", growth: "↑↑↑" },
      { title: "AI生成落地页实战", description: "独立开发者分享一天做三个落地页，小红书收藏量 4200", growth: "↑↑" },
    ],
    suggestions: [
      {
        title: "Vibe Coding 入门指南：自然语言编程真的来了",
        brief: "Vibe Coding 概念热度爆发，用户对「用说话写代码」话题既好奇又质疑。爆点：颠覆传统编程认知，容易引发「这也能行？」的讨论。增长空间：非技术人群对此类内容兴趣极高。",
        sources: "抖音×1, 小红书×1, 微博×1",
      },
      {
        title: "独立开发者的一天：AI生成3个落地页实录",
        brief: "效率展示类内容传播力强。爆点：数字冲击力（一天三个），满足「AI到底多快」的好奇。增长空间：自由职业者和独立开发者群体快速增长中。",
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
