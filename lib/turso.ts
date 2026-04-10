// lib/turso.ts
// Turso (libSQL) client for Vercel/serverless deployment

import { createClient, Client } from '@libsql/client';

const TURSO_URL = process.env.TURSO_DATABASE_URL || '';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

let client: Client | null = null;

function getTurso(): Client {
  if (!client) {
    client = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    });
  }
  return client;
}

export async function initTursoSchema(): Promise<void> {
  const db = getTurso();

  await db.batch([
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      platforms TEXT NOT NULL DEFAULT '[]',
      category_id TEXT NOT NULL DEFAULT 'claudecode',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(keyword, category_id)
    )`,
    `CREATE TABLE IF NOT EXISTS bloggers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      platform TEXT NOT NULL,
      category_id TEXT NOT NULL DEFAULT 'claudecode'
    )`,
    `CREATE TABLE IF NOT EXISTS content_items (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      keyword TEXT NOT NULL,
      title TEXT NOT NULL,
      desc TEXT DEFAULT '',
      blogger_name TEXT NOT NULL,
      blogger_id TEXT DEFAULT '',
      blogger_avatar TEXT DEFAULT '',
      heat INTEGER DEFAULT 0,
      liked_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      collected_count INTEGER DEFAULT 0,
      shared_count INTEGER DEFAULT 0,
      cover_url TEXT DEFAULT '',
      note_url TEXT DEFAULT '',
      timestamp INTEGER DEFAULT 0,
      collected_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_content_category_date ON content_items(category_id, timestamp DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_content_platform ON content_items(platform)`,
    `CREATE INDEX IF NOT EXISTS idx_content_keyword ON content_items(keyword)`,
    `CREATE TABLE IF NOT EXISTS search_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id TEXT NOT NULL,
      triggered_by TEXT NOT NULL DEFAULT 'manual',
      status TEXT NOT NULL,
      keywords TEXT NOT NULL,
      platforms TEXT NOT NULL,
      total_fetched INTEGER DEFAULT 0,
      total_new INTEGER DEFAULT 0,
      total_duplicate INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      error_message TEXT DEFAULT '',
      details TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_records_category ON search_records(category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_records_created ON search_records(created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS factory_sessions (
      id TEXT PRIMARY KEY,
      input TEXT NOT NULL,
      twitter_mode TEXT NOT NULL DEFAULT 'single',
      selected_platforms TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS factory_outputs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES factory_sessions(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS factory_prompts (
      platform TEXT PRIMARY KEY,
      prompt TEXT NOT NULL
    )`,
  ], 'write');

  // Seed factory prompts
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
    await db.execute({
      sql: 'INSERT OR IGNORE INTO factory_prompts (platform, prompt) VALUES (?, ?)',
      args: [platform, prompt],
    });
  }
}

export async function tursoQuery<T = any>(sql: string, params?: (string | number)[]): Promise<T[]> {
  const db = getTurso();
  const result = await db.execute({ sql, args: params || [] });
  return result.rows as T[];
}

export async function tursoRun(sql: string, params?: (string | number)[]): Promise<number> {
  const db = getTurso();
  const result = await db.execute({ sql, args: params || [] });
  return result.rowsAffected;
}

export async function tursoGet<T = any>(sql: string, params?: (string | number)[]): Promise<T | undefined> {
  const db = getTurso();
  const result = await db.execute({ sql, args: params || [] });
  return result.rows[0] as T | undefined;
}
