# 内容工厂 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-platform content creation AI Agent as a new "内容工厂" tab in the existing content monitoring tool, enabling users to input a topic and generate platform-specific content for 公众号文章, 小红书笔记, Twitter 推文, and 视频脚本.

**Architecture:** Single Next.js page with two states (input form → editor view). Editor uses left sidebar for session history and right panel with tabbed platform-specific editors. SQLite persistence for sessions, outputs, and per-platform prompts. OpenAI API for content generation.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, better-sqlite3, OpenAI API

---

### Task 1: Database schema and functions for factory module

**Files:**
- Modify: `lib/db.ts` — add tables and functions for factory sessions, outputs, and prompts

The database needs three new tables:

```sql
CREATE TABLE factory_sessions (
  id TEXT PRIMARY KEY,
  input TEXT NOT NULL,
  twitter_mode TEXT NOT NULL DEFAULT 'single',
  selected_platforms TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE factory_outputs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES factory_sessions(id) ON DELETE CASCADE
);

CREATE TABLE factory_prompts (
  platform TEXT PRIMARY KEY,
  prompt TEXT NOT NULL
);
```

Add these types and functions to `lib/db.ts`:

```typescript
export interface FactorySessionRow {
  id: string;
  input: string;
  twitter_mode: string; // 'single' | 'thread'
  selected_platforms: string; // JSON array
  created_at: string;
}

export interface FactoryOutputRow {
  id: number;
  session_id: string;
  platform: string;
  content: string;
  created_at: string;
}

export interface FactoryPromptRow {
  platform: string;
  prompt: string;
}

// Sessions
export function createFactorySession(id: string, input: string, twitterMode: string, platforms: string[]): void {
  const db = getDb();
  db.prepare('INSERT INTO factory_sessions (id, input, twitter_mode, selected_platforms) VALUES (?, ?, ?, ?)')
    .run(id, input, twitterMode, JSON.stringify(platforms));
}

export function getFactorySessions(limit = 50): FactorySessionRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM factory_sessions ORDER BY created_at DESC LIMIT ?').all(limit) as FactorySessionRow[];
}

export function getFactorySessionOutputs(sessionId: string): { [platform: string]: string } {
  const db = getDb();
  const rows = db.prepare('SELECT platform, content FROM factory_outputs WHERE session_id = ?').all(sessionId) as FactoryOutputRow[];
  const result: { [platform: string]: string } = {};
  for (const row of rows) result[row.platform] = row.content;
  return result;
}

export function saveFactoryOutputs(sessionId: string, outputs: { [platform: string]: string }): void {
  const db = getDb();
  const stmt = db.prepare('INSERT OR REPLACE INTO factory_outputs (session_id, platform, content) VALUES (?, ?, ?)');
  const insertMany = db.transaction((session: string, map: { [platform: string]: string }) => {
    for (const [platform, content] of Object.entries(map)) {
      stmt.run(session, platform, content);
    }
  });
  insertMany(sessionId, outputs);
}

export function deleteFactorySession(sessionId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM factory_sessions WHERE id = ?').run(sessionId);
  db.prepare('DELETE FROM factory_outputs WHERE session_id = ?').run(sessionId);
}

// Prompts
export function getFactoryPrompt(platform: string): string {
  const db = getDb();
  const row = db.prepare('SELECT prompt FROM factory_prompts WHERE platform = ?').get(platform) as FactoryPromptRow | undefined;
  return row?.prompt || '';
}

export function saveFactoryPrompt(platform: string, prompt: string): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO factory_prompts (platform, prompt) VALUES (?, ?)').run(platform, prompt);
}

export function getAllFactoryPrompts(): { [platform: string]: string } {
  const db = getDb();
  const rows = db.prepare('SELECT platform, prompt FROM factory_prompts').all() as FactoryPromptRow[];
  const result: { [platform: string]: string } = {};
  for (const row of rows) result[row.platform] = row.prompt;
  return result;
}
```

- [ ] **Step 1: Add schema to initSchema**

In `lib/db.ts`, find the `initSchema` function. After the `search_records` table definition, before the closing `);`, add:

```typescript
    CREATE TABLE IF NOT EXISTS factory_sessions (
      id TEXT PRIMARY KEY,
      input TEXT NOT NULL,
      twitter_mode TEXT NOT NULL DEFAULT 'single',
      selected_platforms TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS factory_outputs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES factory_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS factory_prompts (
      platform TEXT PRIMARY KEY,
      prompt TEXT NOT NULL
    );
```

- [ ] **Step 2: Add types and functions**

In `lib/db.ts`, after the `clearSearchRecords` function, append all the types and functions shown above (FactorySessionRow, FactoryOutputRow, FactoryPromptRow interfaces and all CRUD functions).

- [ ] **Step 3: Seed default prompts**

In the same file, add a `seedFactoryPrompts()` function that inserts default prompts if they don't exist:

```typescript
export function seedFactoryPrompts(): void {
  const db = getDb();
  const defaults: Record<string, string> = {
    '公众号文章': `你是资深公众号作者，擅长写深度技术文章。
要求：
- 文章长度 2000-3000 字
- 使用小标题分段，每段 3-5 个要点
- 语言风格专业但不枯燥
- 开头要有吸引人的引子，结尾要有总结和行动号召`,
    '小红书笔记': `你是小红书爆款创作者，擅长写种草笔记。
要求：
- 标题 15 字以内，带 emoji
- 正文 200-500 字，简洁有节奏
- 每段不超过 3 行
- 结尾加 3-5 个相关标签（#开头）
- 多用 emoji 增加视觉吸引力`,
    'Twitter 推文': `你是Twitter科技博主，擅长写高互动推文。
要求：
- 单条不超过 280 字符
- 开头要有钩子吸引注意
- 中间要有干货/观点
- 结尾要有互动问题或CTA
- 语言简洁有力，直击重点`,
    '视频脚本': `你是短视频脚本策划师，擅长写口播脚本。
要求：
- 时长 1-3 分钟
- 分镜头标注，含画面和台词
- 开头 3 秒必须有钩子
- 语言口语化，适合朗读
- 结尾要有互动引导`,
  };
  for (const [platform, prompt] of Object.entries(defaults)) {
    db.prepare('INSERT OR IGNORE INTO factory_prompts (platform, prompt) VALUES (?, ?)').run(platform, prompt);
  }
}
```

Call `seedFactoryPrompts()` inside `initSchema()` right after the `database.exec(...)` call:

```typescript
function initSchema(database: Database.Database) {
  database.exec(`...`);
  seedFactoryPrompts();
}
```

- [ ] **Step 4: Verify schema migration works**

Run the dev server and confirm no errors on startup. The `initSchema` will auto-create tables and seed prompts.

```bash
curl -s http://localhost:3010/ | head -c 100
```
Expected: HTML output with no error in server console.

- [ ] **Step 5: Commit**

```bash
git add lib/db.ts
git commit -m "feat: add factory module database schema and functions"
```

---

### Task 2: Factory API endpoints

**Files:**
- Create: `app/api/factory/sessions/route.ts` — sessions CRUD
- Create: `app/api/factory/outputs/route.ts` — get/save outputs for a session
- Create: `app/api/factory/generate/route.ts` — AI generation endpoint
- Create: `app/api/factory/prompts/route.ts` — prompts CRUD

**Prerequisite:** Create `.env.local` with `OPENAI_API_KEY=your_key_here`. The user will need to add their key.

- [ ] **Step 1: Create sessions endpoint**

```typescript
// app/api/factory/sessions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createFactorySession, getFactorySessions, deleteFactorySession, getFactorySessionOutputs, saveFactoryOutputs } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (sessionId) {
    const outputs = getFactorySessionOutputs(sessionId);
    return NextResponse.json({ outputs });
  }

  const sessions = getFactorySessions(50);
  // Format for UI
  const formatted = sessions.map((s) => ({
    id: s.id,
    input: s.input.slice(0, 60) + (s.input.length > 60 ? '...' : ''),
    platforms: JSON.parse(s.selected_platforms),
    created_at: s.created_at,
  }));
  return NextResponse.json({ sessions: formatted });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { input, twitterMode, platforms } = body as { input: string; twitterMode: string; platforms: string[] };
  if (!input || !platforms?.length) {
    return NextResponse.json({ error: 'input and platforms are required' }, { status: 400 });
  }
  const id = uuidv4().slice(0, 12);
  createFactorySession(id, input, twitterMode || 'single', platforms);
  return NextResponse.json({ sessionId: id });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { sessionId } = body as { sessionId: string };
  deleteFactorySession(sessionId);
  return NextResponse.json({ message: 'OK' });
}
```

- [ ] **Step 2: Install uuid package**

```bash
npm install uuid
npm install -D @types/uuid
```

- [ ] **Step 3: Create generate endpoint**

```typescript
// app/api/factory/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getFactoryPrompt, saveFactoryOutputs } from '@/lib/db';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const PLATFORM_SYSTEM_MAP: Record<string, string> = {
  '公众号文章': 'You are a professional WeChat public account author writing long-form depth articles.',
  '小红书笔记': 'You are a Xiaohongshu content creator writing engaging short posts with emoji.',
  'Twitter 推文': 'You are a Twitter tech influencer writing concise, high-engagement tweets.',
  '视频脚本': 'You are a short video script writer creating spoken-word scripts.',
};

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, input, platforms, twitterMode } = body as {
      sessionId: string;
      input: string;
      platforms: string[];
      twitterMode: string;
    };

    const results: { [platform: string]: string } = {};
    const errors: { [platform: string]: string } = {};

    for (const platform of platforms) {
      try {
        const customPrompt = getFactoryPrompt(platform);
        const systemPrompt = customPrompt || PLATFORM_SYSTEM_MAP[platform] || '';

        let userPrompt = input;
        if (platform === 'Twitter 推文' && twitterMode === 'thread') {
          userPrompt = input + '\n\n请以 Twitter Thread 形式生成，包含 3-5 条连续的推文，每条之间用 --- 分隔。';
        }

        const content = await callOpenAI(systemPrompt, userPrompt);
        results[platform] = content;
      } catch (err: any) {
        errors[platform] = err.message;
      }
    }

    if (Object.keys(results).length > 0) {
      saveFactoryOutputs(sessionId, results);
    }

    return NextResponse.json({ results, errors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create prompts endpoint**

```typescript
// app/api/factory/prompts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAllFactoryPrompts, saveFactoryPrompt } from '@/lib/db';

export async function GET() {
  return NextResponse.json({ prompts: getAllFactoryPrompts() });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { platform, prompt } = body as { platform: string; prompt: string };
  if (!platform || prompt === undefined) {
    return NextResponse.json({ error: 'platform and prompt are required' }, { status: 400 });
  }
  saveFactoryPrompt(platform, prompt);
  return NextResponse.json({ message: 'OK' });
}
```

- [ ] **Step 5: Create .env.local**

```bash
echo 'OPENAI_API_KEY=your_openai_api_key_here' > .env.local
```

The user must replace `your_openai_api_key_here` with their actual OpenAI API key.

- [ ] **Step 6: Commit**

```bash
git add app/api/factory/ .env.local package.json package-lock.json
git commit -m "feat: add factory API endpoints and OpenAI integration"
```

---

### Task 3: Zustand store extension for factory state

**Files:**
- Modify: `store/useStore.ts`

Add factory-related state:

```typescript
// In AppState interface, add:
activeTab: string; // already exists, just ensure it supports "factory"
factoryView: 'input' | 'editor' | 'settings';
factorySessionId: string | null;
factoryInput: string;
factoryPlatforms: string[];
factoryTwitterMode: 'single' | 'thread';
factoryActivePlatform: string;

// In the create() call, add defaults:
factoryView: 'input',
factorySessionId: null,
factoryInput: '',
factoryPlatforms: [],
factoryTwitterMode: 'single',
factoryActivePlatform: '公众号文章',

// And setters:
setFactoryView: (view: 'input' | 'editor' | 'settings') => set({ factoryView: view }),
setFactorySessionId: (id: string | null) => set({ factorySessionId: id }),
setFactoryInput: (input: string) => set({ factoryInput: input }),
toggleFactoryPlatform: (platform: string) =>
  set((state) => {
    const current = state.factoryPlatforms;
    const next = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform];
    return { factoryPlatforms: next };
  }),
setFactoryTwitterMode: (mode: 'single' | 'thread') => set({ factoryTwitterMode: mode }),
setFactoryActivePlatform: (platform: string) => set({ factoryActivePlatform: platform }),
resetFactoryInput: () => set({ factoryView: 'input', factorySessionId: null, factoryInput: '', factoryPlatforms: [], factoryTwitterMode: 'single', factoryActivePlatform: '公众号文章' }),
```

- [ ] **Step 1: Add factory state to useStore**

In `store/useStore.ts`, add the new state properties and setters to both the `AppState` interface and the `create<AppState>()` call.

- [ ] **Step 2: Commit**

```bash
git add store/useStore.ts
git commit -m "feat: add factory state to store"
```

---

### Task 4: Add "内容工厂" tab to navigation

**Files:**
- Modify: `app/tab-nav.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Add tab entry**

In `app/tab-nav.tsx`, add to the `tabs` array:

```typescript
const tabs = [
  { key: "content", label: "内容" },
  { key: "report", label: "选题报告" },
  { key: "records", label: "记录" },
  { key: "factory", label: "内容工厂" },
  { key: "settings", label: "监控设置" },
];
```

- [ ] **Step 2: Render factory tab**

In `app/page.tsx`, add import and rendering:

```typescript
import FactoryTab from "./factory-tab";
// ...
{activeTab === "factory" && <FactoryTab />}
```

- [ ] **Step 3: Commit**

```bash
git add app/tab-nav.tsx app/page.tsx
git commit -m "feat: add 内容工厂 tab to navigation"
```

---

### Task 5: Factory input form (State A)

**Files:**
- Create: `app/factory-tab.tsx` — main tab container with two-state logic
- Create: `app/factory-input.tsx` — input form component

- [ ] **Step 1: Create factory-tab.tsx**

```typescript
// app/factory-tab.tsx

"use client";

import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import FactoryInput from "./factory-input";
import FactoryEditor from "./factory-editor";
import FactorySettings from "./factory-settings";

export default function FactoryTab() {
  const { factoryView } = useStore();

  return (
    <div className="flex flex-col h-full">
      {factoryView === 'input' && <FactoryInput />}
      {factoryView === 'editor' && <FactoryEditor />}
      {factoryView === 'settings' && <FactorySettings />}
    </div>
  );
}
```

- [ ] **Step 2: Create factory-input.tsx**

The `FACTORY_PLATFORMS` constant:

```typescript
const FACTORY_PLATFORMS = ["公众号文章", "小红书笔记", "Twitter 推文", "视频脚本"];
const PLATFORM_ICONS: Record<string, string> = {
  "公众号文章": "📝",
  "小红书笔记": "📕",
  "Twitter 推文": "🐦",
  "视频脚本": "🎬",
};
```

Full component code:

```typescript
// app/factory-input.tsx

"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { Settings, Sparkles } from "lucide-react";

const FACTORY_PLATFORMS = ["公众号文章", "小红书笔记", "Twitter 推文", "视频脚本"];
const PLATFORM_ICONS: Record<string, string> = {
  "公众号文章": "📝",
  "小红书笔记": "📕",
  "Twitter 推文": "🐦",
  "视频脚本": "🎬",
};

export default function FactoryInput() {
  const {
    factoryInput, factoryPlatforms, factoryTwitterMode,
    setFactoryInput, toggleFactoryPlatform, setFactoryTwitterMode,
    setFactoryView, setFactorySessionId,
  } = useStore();

  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!factoryInput.trim() || factoryPlatforms.length === 0) return;

    setGenerating(true);

    // Step 1: Create session
    const sessionRes = await fetch("/api/factory/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: factoryInput.trim(),
        twitterMode: factoryTwitterMode,
        platforms: factoryPlatforms,
      }),
    });
    const sessionData = await sessionRes.json();
    const sessionId = sessionData.sessionId;

    // Step 2: Generate content
    const genRes = await fetch("/api/factory/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        input: factoryInput.trim(),
        platforms: factoryPlatforms,
        twitterMode: factoryTwitterMode,
      }),
    });
    const genData = await genRes.json();

    if (genData.error) {
      alert("生成失败: " + genData.error);
      setGenerating(false);
      return;
    }

    setFactorySessionId(sessionId);
    setFactoryView("editor");
    setGenerating(false);
  };

  const anyPlatformSelected = factoryPlatforms.length > 0;

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      {/* Settings button */}
      <div className="absolute top-6 right-8 flex items-center gap-3">
        <button
          onClick={() => setFactoryView("settings")}
          className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:shadow-sm transition-all"
        >
          <Settings className="w-4 h-4" /> 提示词设置
        </button>
      </div>

      <div className="w-full max-w-3xl space-y-10">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">今天想写什么？</h2>
          <p className="text-sm text-gray-400 mt-2">输入创作需求，AI 为你生成多平台内容</p>
        </div>

        {/* Input area */}
        <textarea
          value={factoryInput}
          onChange={(e) => setFactoryInput(e.target.value)}
          placeholder="在这里输入你的创作需求...\n例如：写一篇关于「AI编程工具对比」的内容"
          className="w-full h-48 bg-white rounded-2xl p-6 text-sm text-gray-700 placeholder:text-gray-300 outline-none resize-none shadow-sm focus:ring-2 focus:ring-accent/20 transition-all"
        />

        {/* Platform selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 font-medium">选择生成平台</span>
            {factoryPlatforms.includes("Twitter 推文") && (
              <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-sm">
                <span className="text-xs text-gray-400">Twitter 模式:</span>
                <button
                  onClick={() => setFactoryTwitterMode("single")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    factoryTwitterMode === "single"
                      ? "bg-accent text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  单条推文
                </button>
                <button
                  onClick={() => setFactoryTwitterMode("thread")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    factoryTwitterMode === "thread"
                      ? "bg-accent text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  Thread
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {FACTORY_PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => toggleFactoryPlatform(p)}
                className={`flex items-center gap-2.5 px-6 py-3.5 rounded-xl transition-all text-sm font-semibold ${
                  factoryPlatforms.includes(p)
                    ? "bg-accent/8 text-accent shadow-sm"
                    : "bg-white text-gray-400 hover:text-gray-600 hover:shadow-sm"
                }`}
              >
                <span>{PLATFORM_ICONS[p]}</span>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleGenerate}
            disabled={generating || !factoryInput.trim() || !anyPlatformSelected}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-accent to-purple-500 text-white rounded-2xl text-sm font-semibold hover:shadow-lg hover:shadow-accent/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                开始生成
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/factory-tab.tsx app/factory-input.tsx
git commit -m "feat: add factory input form (State A)"
```

---

### Task 6: Factory editor (State B) — history sidebar and platform tabs

**Files:**
- Create: `app/factory-editor.tsx` — main editor container
- Create: `app/factory-history.tsx` — left sidebar with session history
- Create: `app/factory-content-area.tsx` — right panel with tabbed content

- [ ] **Step 1: Create factory-editor.tsx**

```typescript
// app/factory-editor.tsx

"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import FactoryHistory from "./factory-history";
import FactoryContentArea from "./factory-content-area";

export default function FactoryEditor() {
  const { factorySessionId } = useStore();
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/factory/sessions")
      .then((res) => res.json())
      .then((data) => setSessionHistory(data.sessions || []));
  }, []);

  return (
    <div className="flex h-full">
      {/* Left sidebar */}
      <div className="w-72 shrink-0 border-r border-gray-100 bg-white overflow-y-auto">
        <FactoryHistory sessions={sessionHistory} onRefresh={(sessions) => setSessionHistory(sessions)} />
      </div>
      {/* Right content area */}
      <div className="flex-1 overflow-auto">
        <FactoryContentArea />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create factory-history.tsx**

```typescript
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
    factorySessionId, setFactorySessionId, setFactoryView,
    factoryInput, factoryPlatforms, setFactoryInput, toggleFactoryPlatform,
    setFactoryTwitterMode, resetFactoryInput,
  } = useStore();

  const handleNewSession = () => {
    resetFactoryInput();
    setFactoryView("input");
  };

  const handleSelectSession = (id: string) => {
    setFactorySessionId(id);
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">创作记录</span>
          <span className="text-xs text-gray-400">{sessions.length} 条</span>
        </div>
      </div>

      {/* New session button */}
      <div className="px-4 py-3">
        <button
          onClick={handleNewSession}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-accent bg-accent/8 hover:bg-accent/12 transition-all"
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
              onClick={() => handleSelectSession(s.id)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all group ${
                factorySessionId === s.id
                  ? "bg-accent/8 text-accent"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{s.input}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{formatDate(s.created_at)}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400">{s.platforms.join(", ")}</span>
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
```

- [ ] **Step 3: Create factory-content-area.tsx**

```typescript
// app/factory-content-area.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { Copy, Edit3, Send, Settings, ArrowLeft } from "lucide-react";

const FACTORY_PLATFORMS = ["公众号文章", "小红书笔记", "Twitter 推文", "视频脚本"];
const PLATFORM_ICONS: Record<string, string> = {
  "公众号文章": "📝",
  "小红书笔记": "📕",
  "Twitter 推文": "🐦",
  "视频脚本": "🎬",
};

const PLATFORM_CAN_PUBLISH = ["公众号文章", "小红书笔记", "Twitter 推文"];

export default function FactoryContentArea() {
  const {
    factorySessionId, factoryActivePlatform, setFactoryActivePlatform, setFactoryView,
  } = useStore();

  const [outputs, setOutputs] = useState<{ [platform: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  const activeOutput = outputs[factoryActivePlatform] || "";

  const loadOutputs = useCallback(async () => {
    if (!factorySessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/factory/sessions?sessionId=${factorySessionId}`);
      const data = await res.json();
      setOutputs(data.outputs || {});
    } catch (e) {
      console.error("Failed to load outputs:", e);
    } finally {
      setLoading(false);
    }
  }, [factorySessionId]);

  useEffect(() => {
    loadOutputs();
  }, [loadOutputs]);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeOutput);
  };

  const handlePublish = () => {
    alert("发布功能待实现");
  };

  const handleSaveEdit = async () => {
    await fetch("/api/factory/sessions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: factorySessionId,
        platform: factoryActivePlatform,
        content: editContent,
      }),
    });
    setOutputs((prev) => ({ ...prev, [factoryActivePlatform]: editContent }));
    setEditing(false);
  };

  const startEdit = () => {
    setEditContent(activeOutput);
    setEditing(true);
  };

  if (!factorySessionId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        选择或创建一个创作会话
      </div>
    );
  }

  const canPublish = PLATFORM_CAN_PUBLISH.includes(factoryActivePlatform);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-7 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFactoryView("input")}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-base font-bold text-gray-700">
            {PLATFORM_ICONS[factoryActivePlatform]} {factoryActivePlatform}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={startEdit}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
          >
            <Edit3 className="w-4 h-4" /> 编辑
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
          >
            <Copy className="w-4 h-4" /> 复制
          </button>
          {canPublish && (
            <button
              onClick={handlePublish}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-accent text-white hover:bg-accent/90 transition-all"
            >
              <Send className="w-4 h-4" /> 发布
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-7">
        {loading ? (
          <div className="text-center py-24 text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-gray-200 border-t-accent rounded-full mx-auto mb-4" />
            <p className="text-sm">加载中...</p>
          </div>
        ) : editing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-full bg-white rounded-2xl p-6 text-sm text-gray-700 outline-none resize-none shadow-sm focus:ring-2 focus:ring-accent/20"
          />
        ) : activeOutput ? (
          <div className="bg-white rounded-2xl p-7 shadow-sm whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
            {activeOutput}
          </div>
        ) : (
          <div className="text-center py-24 text-gray-400">
            该平台暂无生成内容
          </div>
        )}
      </div>

      {/* Platform tabs */}
      <div className="px-7 py-4 border-t border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          {FACTORY_PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => setFactoryActivePlatform(p)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                factoryActivePlatform === p
                  ? "bg-accent/8 text-accent shadow-sm"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>{PLATFORM_ICONS[p]}</span>
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add PUT handler for updating outputs**

In `app/api/factory/sessions/route.ts`, add a PUT method:

```typescript
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { sessionId, platform, content } = body as { sessionId: string; platform: string; content: string };
  if (!sessionId || !platform || content === undefined) {
    return NextResponse.json({ error: 'sessionId, platform, and content are required' }, { status: 400 });
  }
  saveFactoryOutputs(sessionId, { [platform]: content });
  return NextResponse.json({ message: 'OK' });
}
```

- [ ] **Step 5: Commit**

```bash
git add app/factory-editor.tsx app/factory-history.tsx app/factory-content-area.tsx app/api/factory/sessions/route.ts
git commit -m "feat: add factory editor with history sidebar and platform tabs"
```

---

### Task 7: Factory settings (prompt configuration)

**Files:**
- Create: `app/factory-settings.tsx`

- [ ] **Step 1: Create factory-settings.tsx**

```typescript
// app/factory-settings.tsx

"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { Save, RotateCcw, ArrowLeft, Check } from "lucide-react";

const PLATFORMS = ["公众号文章", "小红书笔记", "Twitter 推文", "视频脚本"];
const PLATFORM_ICONS: Record<string, string> = {
  "公众号文章": "📝",
  "小红书笔记": "📕",
  "Twitter 推文": "🐦",
  "视频脚本": "🎬",
};

export default function FactorySettings() {
  const { setFactoryView } = useStore();
  const [prompts, setPrompts] = useState<{ [platform: string]: string }>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/factory/prompts")
      .then((res) => res.json())
      .then((data) => setPrompts(data.prompts || {}));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    for (const [platform, prompt] of Object.entries(prompts)) {
      await fetch("/api/factory/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, prompt }),
      });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = async () => {
    // Reset to defaults by deleting all prompts (they'll be re-seeded on next restart)
    for (const platform of PLATFORMS) {
      const defaults: Record<string, string> = {
        '公众号文章': `你是资深公众号作者，擅长写深度技术文章。\n要求：\n- 文章长度 2000-3000 字\n- 使用小标题分段，每段 3-5 个要点\n- 语言风格专业但不枯燥\n- 开头要有吸引人的引子，结尾要有总结和行动号召`,
        '小红书笔记': `你是小红书爆款创作者，擅长写种草笔记。\n要求：\n- 标题 15 字以内，带 emoji\n- 正文 200-500 字，简洁有节奏\n- 每段不超过 3 行\n- 结尾加 3-5 个相关标签（#开头）\n- 多用 emoji 增加视觉吸引力`,
        'Twitter 推文': `你是Twitter科技博主，擅长写高互动推文。\n要求：\n- 单条不超过 280 字符\n- 开头要有钩子吸引注意\n- 中间要有干货/观点\n- 结尾要有互动问题或CTA\n- 语言简洁有力，直击重点`,
        '视频脚本': `你是短视频脚本策划师，擅长写口播脚本。\n要求：\n- 时长 1-3 分钟\n- 分镜头标注，含画面和台词\n- 开头 3 秒必须有钩子\n- 语言口语化，适合朗读\n- 结尾要有互动引导`,
      };
      await fetch("/api/factory/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, prompt: defaults[platform] || "" }),
      });
    }
    setPrompts({
      '公众号文章': defaults['公众号文章'],
      '小红书笔记': defaults['小红书笔记'],
      'Twitter 推文': defaults['Twitter 推文'],
      '视频脚本': defaults['视频脚本'],
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc]">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setFactoryView("input")}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-gray-800">提示词设置</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:shadow-sm transition-all font-medium"
          >
            <RotateCcw className="w-4 h-4" /> 重置
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-accent to-purple-500 rounded-xl text-sm font-semibold text-white hover:shadow-lg hover:shadow-accent/25 transition-all disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? "已保存 ✓" : "保存设置"}
          </button>
        </div>
      </div>

      {/* Prompt editors */}
      <div className="flex-1 overflow-auto p-8 space-y-8 max-w-4xl">
        {PLATFORMS.map((platform) => (
          <div key={platform} className="bg-white rounded-2xl p-7 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span>{PLATFORM_ICONS[platform]}</span>
              {platform}
            </h3>
            <textarea
              value={prompts[platform] || ""}
              onChange={(e) => setPrompts((prev) => ({ ...prev, [platform]: e.target.value }))}
              className="w-full h-40 bg-gray-50 rounded-xl p-5 text-sm text-gray-700 outline-none resize-none focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-gray-300"
              placeholder={`输入${platform}的生成提示词...`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/factory-settings.tsx
git commit -m "feat: add factory prompt settings page"
```

---

### Task 8: Integration testing and final polish

**Files to verify:**
- All files created/modified above

- [ ] **Step 1: Verify all tabs render**

Start dev server and verify all 5 tabs work:

```bash
curl -s http://localhost:3010/ | grep -o '内容工厂'
```
Expected: "内容工厂" appears in tab navigation.

- [ ] **Step 2: Test full generation flow**

1. Navigate to "内容工厂" tab
2. Enter text in input area
3. Select at least one platform
4. Click "开始生成"
5. Verify: switches to editor view, content loads for selected platform
6. Switch between platform tabs, verify each shows correct content
7. Test edit, copy buttons
8. Test "提示词设置" button, modify a prompt, save
9. Test "新创作" button in history sidebar
10. Test session deletion

- [ ] **Step 3: Verify database persistence**

```bash
node -e "
const db = require('better-sqlite3')('data/monitor.db');
console.log('Sessions:', db.prepare('SELECT COUNT(*) as cnt FROM factory_sessions').get().cnt);
console.log('Outputs:', db.prepare('SELECT COUNT(*) as cnt FROM factory_outputs').get().cnt);
console.log('Prompts:', db.prepare('SELECT platform, length(prompt) as len FROM factory_prompts').all());
"
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: final polish for content factory feature"
```

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `lib/db.ts` | Modify | Add factory tables, types, and CRUD functions |
| `app/api/factory/sessions/route.ts` | Create | Sessions CRUD API (GET/POST/DELETE/PUT) |
| `app/api/factory/generate/route.ts` | Create | OpenAI content generation API |
| `app/api/factory/prompts/route.ts` | Create | Prompt configuration API (GET/PUT) |
| `.env.local` | Create | OpenAI API key storage |
| `store/useStore.ts` | Modify | Add factory-related state |
| `app/tab-nav.tsx` | Modify | Add "内容工厂" tab |
| `app/page.tsx` | Modify | Render FactoryTab component |
| `app/factory-tab.tsx` | Create | Main tab container (3-state router) |
| `app/factory-input.tsx` | Create | Input form (State A) |
| `app/factory-editor.tsx` | Create | Editor container (State B) |
| `app/factory-history.tsx` | Create | Left sidebar with session history |
| `app/factory-content-area.tsx` | Create | Right panel with platform tabs and editor |
| `app/factory-settings.tsx` | Create | Per-platform prompt configuration |
