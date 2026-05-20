// lib/ai.ts
// 火山 Coding Plan Pro 代码模型调用封装

const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY || '';

// Coding Plan Pro - 使用 Doubao-Seed-2.0-Code 模型
const DEFAULT_MODEL = 'Doubao-Seed-2.0-Code';

// Coding Plan API 地址
const API_BASE = 'https://ark.cn-beijing.volces.com/api/coding/v3';

// 兼容 OpenAI 格式调用
export async function callVolcEngine(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOLCENGINE_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`VolcEngine API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// 兼容旧调用
export async function callMiniMax(systemPrompt: string, userPrompt: string): Promise<string> {
  return callVolcEngine(systemPrompt, userPrompt);
}
