// app/api/content/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getContentByCategoryAndDate, getDateCounts } from '@/lib/db';

function parseDateStr(dateStr: string): { start: number; end: number } {
  const match = dateStr.match(/(\d+)月(\d+)日/);
  if (!match) return { start: 0, end: 0 };
  const month = parseInt(match[1]);
  const day = parseInt(match[2]);
  const year = new Date().getFullYear();
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).getTime() / 1000 - 8 * 3600;
  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)).getTime() / 1000 - 8 * 3600;
  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId') || 'claudecode';
    const dateStr = searchParams.get('date') || '';
    const platformsParam = searchParams.get('platforms');
    const platforms = platformsParam ? platformsParam.split(',') : undefined;
    const mode = searchParams.get('mode');

    if (mode === 'dates') {
      const { start, end } = parseDateStr(dateStr || '4月10日');
      const wideEnd = Math.floor(Date.now() / 1000);
      const wideStart = wideEnd - 30 * 86400;
      const counts = await getDateCounts(categoryId, wideStart, wideEnd, platforms);
      const formatted = counts.map((c: any) => {
        const d = new Date(c.date);
        return { date: `${d.getMonth() + 1}月${d.getDate()}日`, count: c.count };
      });
      return NextResponse.json({ dates: formatted });
    }

    const { start, end } = parseDateStr(dateStr);
    const items = await getContentByCategoryAndDate(categoryId, start, end, platforms);

    const formatted = items.map((item: any) => {
      const d = new Date(item.timestamp * 1000 + 8 * 3600 * 1000);
      const timeStr = `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const dateStr = `${d.getMonth() + 1}月${d.getDate()}日`;
      return {
        id: item.id,
        title: item.title,
        platform: item.platform,
        blogger: item.blogger_name,
        followers: '',
        heat: item.heat,
        engagement: {
          likes: item.liked_count,
          comments: item.comments_count,
          shares: item.collected_count,
        },
        collectedAt: timeStr,
        date: dateStr,
        desc: item.desc,
        coverUrl: item.cover_url,
        noteUrl: item.note_url,
        keyword: item.keyword,
      };
    });

    return NextResponse.json({ items: formatted });
  } catch (err: any) {
    console.error('Content API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
