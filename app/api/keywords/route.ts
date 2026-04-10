// app/api/keywords/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getKeywords, addKeyword, removeKeyword, updateKeywordPlatforms } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId') || 'claudecode';
  const keywords = await getKeywords(categoryId);
  const formatted = keywords.map((kw: any) => ({
    keyword: kw.keyword,
    platforms: JSON.parse(kw.platforms) as string[],
  }));
  return NextResponse.json({ keywords: formatted });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { categoryId, keyword, platforms } = body as {
    categoryId: string;
    keyword: string;
    platforms: string[];
  };

  if (!keyword || !platforms?.length) {
    return NextResponse.json({ error: 'keyword and platforms are required' }, { status: 400 });
  }

  await addKeyword(keyword, platforms, categoryId || 'claudecode');
  return NextResponse.json({ message: 'OK' });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { categoryId, keyword } = body as { categoryId: string; keyword: string };
  await removeKeyword(keyword, categoryId || 'claudecode');
  return NextResponse.json({ message: 'OK' });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { categoryId, keyword, platforms } = body as {
    categoryId: string;
    keyword: string;
    platforms: string[];
  };
  await updateKeywordPlatforms(keyword, platforms, categoryId || 'claudecode');
  return NextResponse.json({ message: 'OK' });
}
