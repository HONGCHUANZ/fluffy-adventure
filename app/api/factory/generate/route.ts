// app/api/factory/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getFactoryPrompt, saveFactoryOutputs } from '@/lib/db';
import { callMiniMax } from '@/lib/ai';

export const dynamic = 'force-dynamic';

const PLATFORM_SYSTEM_MAP: Record<string, string> = {
  '公众号文章': '你是资深公众号作者，擅长写深度技术文章。',
  '小红书笔记': '你是小红书爆款创作者，擅长写种草笔记。',
  'Twitter 推文': '你是Twitter科技博主，擅长写高互动推文。',
  '视频脚本': '你是短视频脚本策划师，擅长写口播脚本。',
};

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
        const customPrompt = await getFactoryPrompt(platform);
        const systemPrompt = customPrompt || PLATFORM_SYSTEM_MAP[platform] || '';

        let userPrompt = input;
        if (platform === 'Twitter 推文' && twitterMode === 'thread') {
          userPrompt = input + '\n\n请以 Twitter Thread 形式生成，包含 3-5 条连续的推文，每条之间用 --- 分隔。';
        }

        const content = await callMiniMax(systemPrompt, userPrompt);
        results[platform] = content;
      } catch (err: any) {
        errors[platform] = err.message;
      }
    }

    if (Object.keys(results).length > 0) {
      await saveFactoryOutputs(sessionId, results);
    }

    return NextResponse.json({ results, errors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
