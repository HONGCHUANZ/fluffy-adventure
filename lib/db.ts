// lib/db.ts
// Dual backend: better-sqlite3 (local) or Turso/libSQL (Vercel)

import { createClient } from '@libsql/client';

const TURSO_URL = process.env.TURSO_DATABASE_URL || '';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

const isTurso = TURSO_URL && TURSO_TOKEN;

// ─── Turso Client ─────────────────────────────────────────

let tursoClient: ReturnType<typeof createClient> | null = null;
let schemaInitialized = false;

async function ensureTursoSchema() {
  if (!schemaInitialized) {
    schemaInitialized = true;
    await initTursoSchema();
  }
}

function getTurso() {
  if (!tursoClient) {
    tursoClient = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  }
  return tursoClient;
}

async function tursoExec(sql: string) {
  await ensureTursoSchema();
  await getTurso().execute(sql);
}

async function tursoQuery<T = any>(sql: string, params?: (string | number | null)[]): Promise<T[]> {
  await ensureTursoSchema();
  const result = await getTurso().execute({ sql, args: params || [] });
  return result.rows as T[];
}

async function tursoRun(sql: string, params?: (string | number | null)[]): Promise<number> {
  await ensureTursoSchema();
  const result = await getTurso().execute({ sql, args: params || [] });
  return result.rowsAffected;
}

async function tursoGet<T = any>(sql: string, params?: (string | number | null)[]): Promise<T | undefined> {
  await ensureTursoSchema();
  const result = await getTurso().execute({ sql, args: params || [] });
  return result.rows[0] as T | undefined;
}

// ─── Init Schema ──────────────────────────────────────────

export async function initSchema(): Promise<void> {
  if (isTurso) {
    await initTursoSchema();
  } else {
    // Local: use better-sqlite3 (synchronous, called on startup)
    initLocalSchema();
  }
}

async function initTursoSchema() {
  const db = getTurso();
  await db.batch([
    `CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS keywords (id INTEGER PRIMARY KEY AUTOINCREMENT, keyword TEXT NOT NULL, platforms TEXT NOT NULL DEFAULT '[]', category_id TEXT NOT NULL DEFAULT 'claudecode', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(keyword, category_id))`,
    `CREATE TABLE IF NOT EXISTS bloggers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, platform TEXT NOT NULL, category_id TEXT NOT NULL DEFAULT 'claudecode')`,
    `CREATE TABLE IF NOT EXISTS content_items (id TEXT PRIMARY KEY, category_id TEXT NOT NULL, platform TEXT NOT NULL, keyword TEXT NOT NULL, title TEXT NOT NULL, desc TEXT DEFAULT '', blogger_name TEXT NOT NULL, blogger_id TEXT DEFAULT '', blogger_avatar TEXT DEFAULT '', heat INTEGER DEFAULT 0, liked_count INTEGER DEFAULT 0, comments_count INTEGER DEFAULT 0, collected_count INTEGER DEFAULT 0, shared_count INTEGER DEFAULT 0, cover_url TEXT DEFAULT '', note_url TEXT DEFAULT '', timestamp INTEGER DEFAULT 0, collected_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE INDEX IF NOT EXISTS idx_content_category_date ON content_items(category_id, timestamp DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_content_platform ON content_items(platform)`,
    `CREATE INDEX IF NOT EXISTS idx_content_keyword ON content_items(keyword)`,
    `CREATE TABLE IF NOT EXISTS search_records (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id TEXT NOT NULL, triggered_by TEXT NOT NULL DEFAULT 'manual', status TEXT NOT NULL, keywords TEXT NOT NULL, platforms TEXT NOT NULL, total_fetched INTEGER DEFAULT 0, total_new INTEGER DEFAULT 0, total_duplicate INTEGER DEFAULT 0, duration_ms INTEGER DEFAULT 0, error_message TEXT DEFAULT '', details TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE INDEX IF NOT EXISTS idx_records_category ON search_records(category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_records_created ON search_records(created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS factory_sessions (id TEXT PRIMARY KEY, input TEXT NOT NULL, twitter_mode TEXT NOT NULL DEFAULT 'single', selected_platforms TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS factory_outputs (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, platform TEXT NOT NULL, content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (session_id) REFERENCES factory_sessions(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS factory_prompts (platform TEXT PRIMARY KEY, prompt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS wechat_accounts (id TEXT PRIMARY KEY, account_name TEXT NOT NULL DEFAULT '', authorizer_appid TEXT NOT NULL UNIQUE, principal_name TEXT NOT NULL DEFAULT '', avatar_url TEXT NOT NULL DEFAULT '', service_type INTEGER DEFAULT 0, verify_type INTEGER DEFAULT 0, access_token TEXT NOT NULL DEFAULT '', refresh_token TEXT NOT NULL DEFAULT '', expires_at INTEGER DEFAULT 0, raw_profile TEXT NOT NULL DEFAULT '{}', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS wechat_oauth_states (state TEXT PRIMARY KEY, redirect_to TEXT NOT NULL DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, expires_at INTEGER DEFAULT 0, used_at DATETIME DEFAULT NULL)`,
    `CREATE TABLE IF NOT EXISTS wechat_draft_sync_records (id TEXT PRIMARY KEY, session_id TEXT NOT NULL DEFAULT '', platform TEXT NOT NULL DEFAULT '公众号文章', account_id TEXT NOT NULL, draft_media_id TEXT NOT NULL DEFAULT '', title TEXT NOT NULL DEFAULT '', digest TEXT NOT NULL DEFAULT '', cover_media_id TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, error_message TEXT NOT NULL DEFAULT '', payload_snapshot TEXT NOT NULL DEFAULT '{}', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE INDEX IF NOT EXISTS idx_wechat_draft_sync_session ON wechat_draft_sync_records(session_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_wechat_draft_sync_account ON wechat_draft_sync_records(account_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS wechat_integration_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
  ], 'write');

  const defaults: Record<string, string> = {
    '公众号文章': `你是资深公众号作者，擅长写深度技术文章。\n要求：\n- 文章长度 2000-3000 字\n- 使用小标题分段，每段 3-5 个要点\n- 语言风格专业但不枯燥\n- 开头要有吸引人的引子，结尾要有总结和行动号召`,
    '小红书笔记': `你是小红书爆款创作者，擅长写种草笔记。\n要求：\n- 标题 15 字以内，带 emoji\n- 正文 200-500 字，简洁有节奏\n- 每段不超过 3 行\n- 结尾加 3-5 个相关标签（#开头）\n- 多用 emoji 增加视觉吸引力`,
    'Twitter 推文': `你是Twitter科技博主，擅长写高互动推文。\n要求：\n- 单条不超过 280 字符\n- 开头要有钩子吸引注意\n- 中间要有干货/观点\n- 结尾要有互动问题或CTA\n- 语言简洁有力，直击重点`,
    '视频脚本': `你是短视频脚本策划师，擅长写口播脚本。\n要求：\n- 时长 1-3 分钟\n- 分镜头标注，含画面和台词\n- 开头 3 秒必须有钩子\n- 语言口语化，适合朗读\n- 结尾要有互动引导`,
  };
  for (const [platform, prompt] of Object.entries(defaults)) {
    await db.execute({ sql: 'INSERT OR IGNORE INTO factory_prompts (platform, prompt) VALUES (?, ?)', args: [platform, prompt] });
  }
}

// ─── Local (better-sqlite3) ───────────────────────────────

let localDb: any = null;
let Database: any = null;

function getLocalDb() {
  if (!Database) {
    try {
      Database = require('better-sqlite3');
    } catch {
      Database = null;
    }
  }
  if (!localDb && Database) {
    const path = require('path');
    const DB_PATH = path.join(process.cwd(), 'data', 'monitor.db');
    localDb = new Database(DB_PATH);
    localDb.pragma('journal_mode = WAL');
  }
  return localDb;
}

function initLocalSchema() {
  const db = getLocalDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS keywords (id INTEGER PRIMARY KEY AUTOINCREMENT, keyword TEXT NOT NULL, platforms TEXT NOT NULL DEFAULT '[]', category_id TEXT NOT NULL DEFAULT 'claudecode', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(keyword, category_id));
    CREATE TABLE IF NOT EXISTS bloggers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, platform TEXT NOT NULL, category_id TEXT NOT NULL DEFAULT 'claudecode');
    CREATE TABLE IF NOT EXISTS content_items (id TEXT PRIMARY KEY, category_id TEXT NOT NULL, platform TEXT NOT NULL, keyword TEXT NOT NULL, title TEXT NOT NULL, desc TEXT DEFAULT '', blogger_name TEXT NOT NULL, blogger_id TEXT DEFAULT '', blogger_avatar TEXT DEFAULT '', heat INTEGER DEFAULT 0, liked_count INTEGER DEFAULT 0, comments_count INTEGER DEFAULT 0, collected_count INTEGER DEFAULT 0, shared_count INTEGER DEFAULT 0, cover_url TEXT DEFAULT '', note_url TEXT DEFAULT '', timestamp INTEGER DEFAULT 0, collected_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS idx_content_category_date ON content_items(category_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_content_platform ON content_items(platform);
    CREATE INDEX IF NOT EXISTS idx_content_keyword ON content_items(keyword);
    CREATE TABLE IF NOT EXISTS search_records (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id TEXT NOT NULL, triggered_by TEXT NOT NULL DEFAULT 'manual', status TEXT NOT NULL, keywords TEXT NOT NULL, platforms TEXT NOT NULL, total_fetched INTEGER DEFAULT 0, total_new INTEGER DEFAULT 0, total_duplicate INTEGER DEFAULT 0, duration_ms INTEGER DEFAULT 0, error_message TEXT DEFAULT '', details TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS idx_records_category ON search_records(category_id);
    CREATE INDEX IF NOT EXISTS idx_records_created ON search_records(created_at DESC);
    CREATE TABLE IF NOT EXISTS factory_sessions (id TEXT PRIMARY KEY, input TEXT NOT NULL, twitter_mode TEXT NOT NULL DEFAULT 'single', selected_platforms TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS factory_outputs (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, platform TEXT NOT NULL, content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (session_id) REFERENCES factory_sessions(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS factory_prompts (platform TEXT PRIMARY KEY, prompt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS wechat_accounts (id TEXT PRIMARY KEY, account_name TEXT NOT NULL DEFAULT '', authorizer_appid TEXT NOT NULL UNIQUE, principal_name TEXT NOT NULL DEFAULT '', avatar_url TEXT NOT NULL DEFAULT '', service_type INTEGER DEFAULT 0, verify_type INTEGER DEFAULT 0, access_token TEXT NOT NULL DEFAULT '', refresh_token TEXT NOT NULL DEFAULT '', expires_at INTEGER DEFAULT 0, raw_profile TEXT NOT NULL DEFAULT '{}', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS wechat_oauth_states (state TEXT PRIMARY KEY, redirect_to TEXT NOT NULL DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, expires_at INTEGER DEFAULT 0, used_at DATETIME DEFAULT NULL);
    CREATE TABLE IF NOT EXISTS wechat_draft_sync_records (id TEXT PRIMARY KEY, session_id TEXT NOT NULL DEFAULT '', platform TEXT NOT NULL DEFAULT '公众号文章', account_id TEXT NOT NULL, draft_media_id TEXT NOT NULL DEFAULT '', title TEXT NOT NULL DEFAULT '', digest TEXT NOT NULL DEFAULT '', cover_media_id TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, error_message TEXT NOT NULL DEFAULT '', payload_snapshot TEXT NOT NULL DEFAULT '{}', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS idx_wechat_draft_sync_session ON wechat_draft_sync_records(session_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_wechat_draft_sync_account ON wechat_draft_sync_records(account_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS wechat_integration_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);

  const defaults: Record<string, string> = {
    '公众号文章': `你是资深公众号作者，擅长写深度技术文章。\n要求：\n- 文章长度 2000-3000 字\n- 使用小标题分段，每段 3-5 个要点\n- 语言风格专业但不枯燥\n- 开头要有吸引人的引子，结尾要有总结和行动号召`,
    '小红书笔记': `你是小红书爆款创作者，擅长写种草笔记。\n要求：\n- 标题 15 字以内，带 emoji\n- 正文 200-500 字，简洁有节奏\n- 每段不超过 3 行\n- 结尾加 3-5 个相关标签（#开头）\n- 多用 emoji 增加视觉吸引力`,
    'Twitter 推文': `你是Twitter科技博主，擅长写高互动推文。\n要求：\n- 单条不超过 280 字符\n- 开头要有钩子吸引注意\n- 中间要有干货/观点\n- 结尾要有互动问题或CTA\n- 语言简洁有力，直击重点`,
    '视频脚本': `你是短视频脚本策划师，擅长写口播脚本。\n要求：\n- 时长 1-3 分钟\n- 分镜头标注，含画面和台词\n- 开头 3 秒必须有钩子\n- 语言口语化，适合朗读\n- 结尾要有互动引导`,
  };
  for (const [platform, prompt] of Object.entries(defaults)) {
    db.prepare('INSERT OR IGNORE INTO factory_prompts (platform, prompt) VALUES (?, ?)').run(platform, prompt);
  }
}

// ─── Unified API ──────────────────────────────────────────
// All methods are async. They route to Turso or better-sqlite3.

// Categories
export async function getCategories() {
  if (isTurso) return tursoQuery('SELECT * FROM categories ORDER BY created_at');
  return getLocalDb().prepare('SELECT * FROM categories ORDER BY created_at').all();
}

export async function addCategory(id: string, name: string) {
  if (isTurso) return tursoRun('INSERT INTO categories (id, name) VALUES (?, ?)', [id, name]);
  return getLocalDb().prepare('INSERT INTO categories (id, name) VALUES (?, ?)').run(id, name);
}

export async function removeCategory(id: string) {
  if (isTurso) {
    await tursoRun('DELETE FROM categories WHERE id = ?', [id]);
    await tursoRun('DELETE FROM keywords WHERE category_id = ?', [id]);
    await tursoRun('DELETE FROM bloggers WHERE category_id = ?', [id]);
    await tursoRun('DELETE FROM content_items WHERE category_id = ?', [id]);
    await tursoRun('DELETE FROM search_records WHERE category_id = ?', [id]);
  } else {
    const db = getLocalDb();
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    db.prepare('DELETE FROM keywords WHERE category_id = ?').run(id);
    db.prepare('DELETE FROM bloggers WHERE category_id = ?').run(id);
    db.prepare('DELETE FROM content_items WHERE category_id = ?').run(id);
    db.prepare('DELETE FROM search_records WHERE category_id = ?').run(id);
  }
}

// Keywords
export async function getKeywords(categoryId: string) {
  if (isTurso) return tursoQuery('SELECT * FROM keywords WHERE category_id = ? ORDER BY id', [categoryId]);
  return getLocalDb().prepare('SELECT * FROM keywords WHERE category_id = ? ORDER BY id').all(categoryId);
}

export async function addKeyword(keyword: string, platforms: string[], categoryId: string) {
  if (isTurso) return tursoRun('INSERT OR IGNORE INTO keywords (keyword, platforms, category_id) VALUES (?, ?, ?)', [keyword, JSON.stringify(platforms), categoryId]);
  return getLocalDb().prepare('INSERT OR IGNORE INTO keywords (keyword, platforms, category_id) VALUES (?, ?, ?)').run(keyword, JSON.stringify(platforms), categoryId);
}

export async function removeKeyword(keyword: string, categoryId: string) {
  if (isTurso) return tursoRun('DELETE FROM keywords WHERE keyword = ? AND category_id = ?', [keyword, categoryId]);
  return getLocalDb().prepare('DELETE FROM keywords WHERE keyword = ? AND category_id = ?').run(keyword, categoryId);
}

export async function updateKeywordPlatforms(keyword: string, platforms: string[], categoryId: string) {
  if (isTurso) return tursoRun('UPDATE keywords SET platforms = ? WHERE keyword = ? AND category_id = ?', [JSON.stringify(platforms), keyword, categoryId]);
  return getLocalDb().prepare('UPDATE keywords SET platforms = ? WHERE keyword = ? AND category_id = ?').run(JSON.stringify(platforms), keyword, categoryId);
}

// Bloggers
export async function getBloggers(categoryId: string) {
  if (isTurso) return tursoQuery('SELECT * FROM bloggers WHERE category_id = ?', [categoryId]);
  return getLocalDb().prepare('SELECT * FROM bloggers WHERE category_id = ?').all(categoryId);
}

export async function addBlogger(name: string, platform: string, categoryId: string) {
  if (isTurso) return tursoRun('INSERT INTO bloggers (name, platform, category_id) VALUES (?, ?, ?)', [name, platform, categoryId]);
  return getLocalDb().prepare('INSERT INTO bloggers (name, platform, category_id) VALUES (?, ?, ?)').run(name, platform, categoryId);
}

export async function removeBlogger(id: number) {
  if (isTurso) return tursoRun('DELETE FROM bloggers WHERE id = ?', [id]);
  return getLocalDb().prepare('DELETE FROM bloggers WHERE id = ?').run(id);
}

// Content
export async function getContentByCategoryAndDate(categoryId: string, dateStart: number, dateEnd: number, platforms?: string[]) {
  if (isTurso) {
    let sql = 'SELECT * FROM content_items WHERE category_id = ? AND timestamp >= ? AND timestamp <= ?';
    const params: (string | number)[] = [categoryId, dateStart, dateEnd];
    if (platforms && platforms.length > 0) {
      const placeholders = platforms.map(() => '?').join(',');
      sql += ` AND platform IN (${placeholders})`;
      params.push(...platforms);
    }
    sql += ' ORDER BY liked_count + comments_count + collected_count DESC';
    return tursoQuery(sql, params);
  }
  let sql = 'SELECT * FROM content_items WHERE category_id = ? AND timestamp >= ? AND timestamp <= ?';
  const params: (string | number)[] = [categoryId, dateStart, dateEnd];
  if (platforms && platforms.length > 0) {
    const placeholders = platforms.map(() => '?').join(',');
    sql += ` AND platform IN (${placeholders})`;
    params.push(...platforms);
  }
  sql += ' ORDER BY liked_count + comments_count + collected_count DESC';
  return getLocalDb().prepare(sql).all(...params);
}

export async function getDateCounts(categoryId: string, dateStart: number, dateEnd: number, platforms?: string[]) {
  if (isTurso) {
    let sql = `SELECT DATE(timestamp, 'unixepoch', '+8 hours') as date, COUNT(*) as count FROM content_items WHERE category_id = ? AND timestamp >= ? AND timestamp <= ?`;
    const params: (string | number)[] = [categoryId, dateStart, dateEnd];
    if (platforms && platforms.length > 0) {
      const placeholders = platforms.map(() => '?').join(',');
      sql += ` AND platform IN (${placeholders})`;
      params.push(...platforms);
    }
    sql += ' GROUP BY date ORDER BY date DESC';
    return tursoQuery(sql, params);
  }
  let sql = `SELECT DATE(timestamp, 'unixepoch', '+8 hours') as date, COUNT(*) as count FROM content_items WHERE category_id = ? AND timestamp >= ? AND timestamp <= ?`;
  const params: (string | number)[] = [categoryId, dateStart, dateEnd];
  if (platforms && platforms.length > 0) {
    const placeholders = platforms.map(() => '?').join(',');
    sql += ` AND platform IN (${placeholders})`;
    params.push(...platforms);
  }
  sql += ' GROUP BY date ORDER BY date DESC';
  return getLocalDb().prepare(sql).all(...params);
}

export async function insertContent(rows: any[]) {
  if (isTurso) {
    await ensureTursoSchema();
    const db = getTurso();
    const results = await db.batch(
      rows.map(item => ({
        sql: 'INSERT OR REPLACE INTO content_items (id, category_id, platform, keyword, title, desc, blogger_name, blogger_id, blogger_avatar, heat, liked_count, comments_count, collected_count, shared_count, cover_url, note_url, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [item.id, item.category_id, item.platform, item.keyword, item.title, item.desc, item.blogger_name, item.blogger_id, item.blogger_avatar, item.heat, item.liked_count, item.comments_count, item.collected_count, item.shared_count, item.cover_url, item.note_url, item.timestamp],
      })),
      'write'
    );
    return results.reduce((sum, r) => sum + r.rowsAffected, 0);
  }
  const db = getLocalDb();
  const stmt = db.prepare('INSERT OR REPLACE INTO content_items (id, category_id, platform, keyword, title, desc, blogger_name, blogger_id, blogger_avatar, heat, liked_count, comments_count, collected_count, shared_count, cover_url, note_url, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertMany = db.transaction((items: any[]) => {
    let count = 0;
    for (const item of items) {
      const result = stmt.run(item.id, item.category_id, item.platform, item.keyword, item.title, item.desc, item.blogger_name, item.blogger_id, item.blogger_avatar, item.heat, item.liked_count, item.comments_count, item.collected_count, item.shared_count, item.cover_url, item.note_url, item.timestamp);
      count += result.changes;
    }
    return count;
  });
  return insertMany(rows);
}

// Search Records
export async function insertSearchRecord(record: {
  category_id: string; triggered_by: string; status: string;
  keywords: string[]; platforms: string[]; total_fetched: number;
  total_new: number; total_duplicate: number; duration_ms: number;
  error_message: string; details: any[];
}) {
  if (isTurso) {
    return tursoRun(
      'INSERT INTO search_records (category_id, triggered_by, status, keywords, platforms, total_fetched, total_new, total_duplicate, duration_ms, error_message, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [record.category_id, record.triggered_by, record.status, JSON.stringify(record.keywords), JSON.stringify(record.platforms), record.total_fetched, record.total_new, record.total_duplicate, record.duration_ms, record.error_message, JSON.stringify(record.details)]
    );
  }
  const db = getLocalDb();
  db.prepare('INSERT INTO search_records (category_id, triggered_by, status, keywords, platforms, total_fetched, total_new, total_duplicate, duration_ms, error_message, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    record.category_id, record.triggered_by, record.status,
    JSON.stringify(record.keywords), JSON.stringify(record.platforms),
    record.total_fetched, record.total_new, record.total_duplicate,
    record.duration_ms, record.error_message, JSON.stringify(record.details)
  );
}

export async function getSearchRecords(categoryId: string, limit = 50) {
  if (isTurso) return tursoQuery('SELECT * FROM search_records WHERE category_id = ? ORDER BY created_at DESC LIMIT ?', [categoryId, limit]);
  return getLocalDb().prepare('SELECT * FROM search_records WHERE category_id = ? ORDER BY created_at DESC LIMIT ?').all(categoryId, limit);
}

export async function clearSearchRecords(categoryId: string) {
  if (isTurso) return tursoRun('DELETE FROM search_records WHERE category_id = ?', [categoryId]);
  return getLocalDb().prepare('DELETE FROM search_records WHERE category_id = ?').run(categoryId);
}

// Factory
export async function createFactorySession(id: string, input: string, twitterMode: string, platforms: string[]) {
  if (isTurso) return tursoRun('INSERT INTO factory_sessions (id, input, twitter_mode, selected_platforms) VALUES (?, ?, ?, ?)', [id, input, twitterMode, JSON.stringify(platforms)]);
  return getLocalDb().prepare('INSERT INTO factory_sessions (id, input, twitter_mode, selected_platforms) VALUES (?, ?, ?, ?)').run(id, input, twitterMode, JSON.stringify(platforms));
}

export async function getFactorySessions(limit = 50) {
  if (isTurso) return tursoQuery('SELECT * FROM factory_sessions ORDER BY created_at DESC LIMIT ?', [limit]);
  return getLocalDb().prepare('SELECT * FROM factory_sessions ORDER BY created_at DESC LIMIT ?').all(limit);
}

export async function getFactorySessionOutputs(sessionId: string) {
  if (isTurso) {
    const rows = await tursoQuery('SELECT platform, content FROM factory_outputs WHERE session_id = ?', [sessionId]);
    const result: { [platform: string]: string } = {};
    for (const row of rows) result[row.platform] = row.content;
    return result;
  }
  const db = getLocalDb();
  const rows = db.prepare('SELECT platform, content FROM factory_outputs WHERE session_id = ?').all(sessionId);
  const result: { [platform: string]: string } = {};
  for (const row of rows) result[row.platform] = row.content;
  return result;
}

export async function saveFactoryOutputs(sessionId: string, outputs: { [platform: string]: string }) {
  if (isTurso) {
    await ensureTursoSchema();
    const db = getTurso();
    await db.batch(
      Object.entries(outputs).map(([platform, content]) => ({
        sql: 'INSERT OR REPLACE INTO factory_outputs (session_id, platform, content) VALUES (?, ?, ?)',
        args: [sessionId, platform, content],
      })),
      'write'
    );
  } else {
    const db = getLocalDb();
    const stmt = db.prepare('INSERT OR REPLACE INTO factory_outputs (session_id, platform, content) VALUES (?, ?, ?)');
    const insertMany = db.transaction((session: string, map: { [platform: string]: string }) => {
      for (const [platform, content] of Object.entries(map)) stmt.run(session, platform, content);
    });
    insertMany(sessionId, outputs);
  }
}

export async function deleteFactorySession(sessionId: string) {
  if (isTurso) {
    await tursoRun('DELETE FROM factory_sessions WHERE id = ?', [sessionId]);
    await tursoRun('DELETE FROM factory_outputs WHERE session_id = ?', [sessionId]);
  } else {
    const db = getLocalDb();
    db.prepare('DELETE FROM factory_sessions WHERE id = ?').run(sessionId);
    db.prepare('DELETE FROM factory_outputs WHERE session_id = ?').run(sessionId);
  }
}

export async function getFactoryPrompt(platform: string) {
  if (isTurso) {
    const row = await tursoGet('SELECT prompt FROM factory_prompts WHERE platform = ?', [platform]);
    return row?.prompt || '';
  }
  const db = getLocalDb();
  const row = db.prepare('SELECT prompt FROM factory_prompts WHERE platform = ?').get(platform);
  return row?.prompt || '';
}

export async function saveFactoryPrompt(platform: string, prompt: string) {
  if (isTurso) return tursoRun('INSERT OR REPLACE INTO factory_prompts (platform, prompt) VALUES (?, ?)', [platform, prompt]);
  return getLocalDb().prepare('INSERT OR REPLACE INTO factory_prompts (platform, prompt) VALUES (?, ?)').run(platform, prompt);
}

export async function getAllFactoryPrompts() {
  if (isTurso) {
    const rows = await tursoQuery('SELECT platform, prompt FROM factory_prompts');
    const result: { [platform: string]: string } = {};
    for (const row of rows) result[row.platform] = row.prompt;
    return result;
  }
  const db = getLocalDb();
  const rows = db.prepare('SELECT platform, prompt FROM factory_prompts').all();
  const result: { [platform: string]: string } = {};
  for (const row of rows) result[row.platform] = row.prompt;
  return result;
}

type WechatAccountRecord = {
  id: string;
  account_name: string;
  authorizer_appid: string;
  principal_name: string;
  avatar_url: string;
  service_type: number;
  verify_type: number;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  raw_profile: string;
  created_at: string;
  updated_at: string;
};

type WechatOAuthStateRecord = {
  state: string;
  redirect_to: string;
  expires_at: number;
  used_at?: string | null;
};

type WechatDraftSyncRecordInput = {
  id: string;
  session_id: string;
  platform: string;
  account_id: string;
  draft_media_id: string;
  title: string;
  digest: string;
  cover_media_id: string;
  status: string;
  error_message: string;
  payload_snapshot: string;
};

export async function saveWechatAccount(account: {
  id: string;
  account_name: string;
  authorizer_appid: string;
  principal_name?: string;
  avatar_url?: string;
  service_type?: number;
  verify_type?: number;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  raw_profile?: string;
}) {
  const params = [
    account.id,
    account.account_name,
    account.authorizer_appid,
    account.principal_name || '',
    account.avatar_url || '',
    account.service_type || 0,
    account.verify_type || 0,
    account.access_token,
    account.refresh_token,
    account.expires_at,
    account.raw_profile || '{}',
  ];

  if (isTurso) {
    return tursoRun(
      `INSERT INTO wechat_accounts (id, account_name, authorizer_appid, principal_name, avatar_url, service_type, verify_type, access_token, refresh_token, expires_at, raw_profile, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(authorizer_appid) DO UPDATE SET
         id = excluded.id,
         account_name = excluded.account_name,
         principal_name = excluded.principal_name,
         avatar_url = excluded.avatar_url,
         service_type = excluded.service_type,
         verify_type = excluded.verify_type,
         access_token = excluded.access_token,
         refresh_token = excluded.refresh_token,
         expires_at = excluded.expires_at,
         raw_profile = excluded.raw_profile,
         updated_at = CURRENT_TIMESTAMP`,
      params
    );
  }

  return getLocalDb().prepare(
    `INSERT INTO wechat_accounts (id, account_name, authorizer_appid, principal_name, avatar_url, service_type, verify_type, access_token, refresh_token, expires_at, raw_profile, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(authorizer_appid) DO UPDATE SET
       id = excluded.id,
       account_name = excluded.account_name,
       principal_name = excluded.principal_name,
       avatar_url = excluded.avatar_url,
       service_type = excluded.service_type,
       verify_type = excluded.verify_type,
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       expires_at = excluded.expires_at,
       raw_profile = excluded.raw_profile,
       updated_at = CURRENT_TIMESTAMP`
  ).run(...params);
}

export async function getWechatAccounts() {
  if (isTurso) return tursoQuery<WechatAccountRecord>('SELECT * FROM wechat_accounts ORDER BY updated_at DESC');
  return getLocalDb().prepare('SELECT * FROM wechat_accounts ORDER BY updated_at DESC').all() as WechatAccountRecord[];
}

export async function getWechatAccountById(id: string) {
  if (isTurso) return tursoGet<WechatAccountRecord>('SELECT * FROM wechat_accounts WHERE id = ?', [id]);
  return getLocalDb().prepare('SELECT * FROM wechat_accounts WHERE id = ?').get(id) as WechatAccountRecord | undefined;
}

export async function getWechatAccountByAuthorizerAppId(authorizerAppId: string) {
  if (isTurso) return tursoGet<WechatAccountRecord>('SELECT * FROM wechat_accounts WHERE authorizer_appid = ?', [authorizerAppId]);
  return getLocalDb().prepare('SELECT * FROM wechat_accounts WHERE authorizer_appid = ?').get(authorizerAppId) as WechatAccountRecord | undefined;
}

export async function createWechatOAuthState(record: WechatOAuthStateRecord) {
  if (isTurso) {
    return tursoRun(
      'INSERT OR REPLACE INTO wechat_oauth_states (state, redirect_to, expires_at, used_at) VALUES (?, ?, ?, ?)',
      [record.state, record.redirect_to, record.expires_at, record.used_at || null]
    );
  }

  return getLocalDb().prepare(
    'INSERT OR REPLACE INTO wechat_oauth_states (state, redirect_to, expires_at, used_at) VALUES (?, ?, ?, ?)'
  ).run(record.state, record.redirect_to, record.expires_at, record.used_at || null);
}

export async function getWechatOAuthState(state: string) {
  if (isTurso) return tursoGet<WechatOAuthStateRecord>('SELECT * FROM wechat_oauth_states WHERE state = ?', [state]);
  return getLocalDb().prepare('SELECT * FROM wechat_oauth_states WHERE state = ?').get(state) as WechatOAuthStateRecord | undefined;
}

export async function consumeWechatOAuthState(state: string) {
  if (isTurso) {
    await tursoRun('UPDATE wechat_oauth_states SET used_at = CURRENT_TIMESTAMP WHERE state = ? AND used_at IS NULL', [state]);
    return tursoGet<WechatOAuthStateRecord>('SELECT * FROM wechat_oauth_states WHERE state = ?', [state]);
  }

  const db = getLocalDb();
  db.prepare('UPDATE wechat_oauth_states SET used_at = CURRENT_TIMESTAMP WHERE state = ? AND used_at IS NULL').run(state);
  return db.prepare('SELECT * FROM wechat_oauth_states WHERE state = ?').get(state) as WechatOAuthStateRecord | undefined;
}

export async function saveWechatIntegrationSetting(key: string, value: string) {
  if (isTurso) {
    return tursoRun('INSERT OR REPLACE INTO wechat_integration_settings (key, value) VALUES (?, ?)', [key, value]);
  }

  return getLocalDb().prepare('INSERT OR REPLACE INTO wechat_integration_settings (key, value) VALUES (?, ?)').run(key, value);
}

export async function getWechatIntegrationSetting(key: string) {
  if (isTurso) {
    const row = await tursoGet<{ value: string }>('SELECT value FROM wechat_integration_settings WHERE key = ?', [key]);
    return row?.value;
  }

  const row = getLocalDb().prepare('SELECT value FROM wechat_integration_settings WHERE key = ?').get(key) as { value?: string } | undefined;
  return row?.value;
}

export async function getAllWechatIntegrationSettings() {
  if (isTurso) {
    const rows = await tursoQuery<{ key: string; value: string }>('SELECT key, value FROM wechat_integration_settings');
    const result: Record<string, string> = {};
    for (const row of rows) result[row.key] = row.value;
    return result;
  }

  const rows = getLocalDb().prepare('SELECT key, value FROM wechat_integration_settings').all() as Array<{ key: string; value: string }>;
  const result: Record<string, string> = {};
  for (const row of rows) result[row.key] = row.value;
  return result;
}

export async function createWechatDraftSyncRecord(record: WechatDraftSyncRecordInput) {
  const params = [
    record.id,
    record.session_id,
    record.platform,
    record.account_id,
    record.draft_media_id,
    record.title,
    record.digest,
    record.cover_media_id,
    record.status,
    record.error_message,
    record.payload_snapshot,
  ];

  if (isTurso) {
    return tursoRun(
      'INSERT INTO wechat_draft_sync_records (id, session_id, platform, account_id, draft_media_id, title, digest, cover_media_id, status, error_message, payload_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      params
    );
  }

  return getLocalDb().prepare(
    'INSERT INTO wechat_draft_sync_records (id, session_id, platform, account_id, draft_media_id, title, digest, cover_media_id, status, error_message, payload_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(...params);
}

export async function getLatestWechatDraftSyncRecordBySession(sessionId: string) {
  if (isTurso) {
    return tursoGet('SELECT * FROM wechat_draft_sync_records WHERE session_id = ? ORDER BY created_at DESC LIMIT 1', [sessionId]);
  }

  return getLocalDb().prepare('SELECT * FROM wechat_draft_sync_records WHERE session_id = ? ORDER BY created_at DESC LIMIT 1').get(sessionId);
}
