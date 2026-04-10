// app/api/refresh/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getKeywords, insertContent, insertSearchRecord } from '@/lib/db';
import { searchNotes } from '@/lib/xiaohongshu';

export const dynamic = 'force-dynamic';

interface KeywordDetail {
  keyword: string;
  fetched: number;
  new: number;
  duplicate: number;
  status: 'success' | 'failed';
  error?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { categoryId, platforms, keywords: keywordList } = body as {
      categoryId: string;
      platforms?: string[];
      keywords?: string[];
    };

    if (!categoryId) {
      return NextResponse.json({ error: 'categoryId is required' }, { status: 400 });
    }

    let keywordsToFetch = keywordList || [];
    let activePlatforms = platforms || [];
    if (keywordsToFetch.length === 0) {
      const dbKeywords = await getKeywords(categoryId);
      keywordsToFetch = dbKeywords.flatMap((kw: any) => {
        const kwPlatforms: string[] = JSON.parse(kw.platforms);
        if (!kwPlatforms.includes('小红书')) return [];
        return [kw.keyword];
      });
      if (activePlatforms.length === 0) {
        activePlatforms = ['小红书'];
      }
    }

    if (keywordsToFetch.length === 0) {
      return NextResponse.json({ message: 'No keywords to fetch for 小红书', newItems: 0 });
    }

    let totalFetched = 0;
    let totalNew = 0;
    let totalDuplicate = 0;
    const details: KeywordDetail[] = [];

    for (const keyword of keywordsToFetch) {
      try {
        const notes = await searchNotes(keyword);
        const fetched = notes.length;
        totalFetched += fetched;

        const allItems = notes.map((note: any) => ({
          id: `xhs_${note.id}`,
          category_id: categoryId,
          platform: '小红书',
          keyword,
          title: note.title,
          desc: note.desc,
          blogger_name: note.user_nickname,
          blogger_id: note.user_id,
          blogger_avatar: note.user_avatar,
          heat: note.heat || 0,
          liked_count: note.liked_count,
          comments_count: note.comments_count,
          collected_count: note.collected_count,
          shared_count: note.shared_count,
          cover_url: note.cover_url,
          note_url: note.note_url,
          timestamp: note.timestamp,
        }));

        const inserted = allItems.length > 0 ? await insertContent(allItems) : 0;
        totalNew += inserted;
        totalDuplicate += fetched - inserted;

        details.push({
          keyword,
          fetched,
          new: inserted,
          duplicate: fetched - inserted,
          status: 'success',
        });
      } catch (err: any) {
        details.push({
          keyword,
          fetched: 0,
          new: 0,
          duplicate: 0,
          status: 'failed',
          error: err.message,
        });
      }
    }

    const duration = Date.now() - startTime;
    const hasErrors = details.some((d) => d.status === 'failed');
    const status = hasErrors ? 'partial' : 'success';

    await insertSearchRecord({
      category_id: categoryId,
      triggered_by: 'manual',
      status,
      keywords: keywordsToFetch,
      platforms: activePlatforms,
      total_fetched: totalFetched,
      total_new: totalNew,
      total_duplicate: totalDuplicate,
      duration_ms: duration,
      error_message: '',
      details,
    });

    return NextResponse.json({
      message: 'OK',
      newItems: totalNew,
      fetchedFrom: '小红书',
      keywordCount: keywordsToFetch.length,
      details,
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    try {
      await insertSearchRecord({
        category_id: 'claudecode',
        triggered_by: 'manual',
        status: 'failed',
        keywords: [],
        platforms: [],
        total_fetched: 0,
        total_new: 0,
        total_duplicate: 0,
        duration_ms: duration,
        error_message: err.message || 'Unknown error',
        details: [],
      });
    } catch {}

    console.error('Refresh error:', err);
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
