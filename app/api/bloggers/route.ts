// app/api/bloggers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getBloggers, addBlogger, removeBlogger } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId') || 'claudecode';
  const bloggers = await getBloggers(categoryId);
  return NextResponse.json({ bloggers });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { categoryId, name, platform } = body as { categoryId: string; name: string; platform: string };
  if (!name || !platform) {
    return NextResponse.json({ error: 'name and platform are required' }, { status: 400 });
  }
  await addBlogger(name, platform, categoryId || 'claudecode');
  return NextResponse.json({ message: 'OK' });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { id } = body as { id: number };
  await removeBlogger(id);
  return NextResponse.json({ message: 'OK' });
}
