// app/api/records/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSearchRecords, clearSearchRecords } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId') || 'claudecode';
  const limit = parseInt(searchParams.get('limit') || '50');
  const records = await getSearchRecords(categoryId, limit);
  return NextResponse.json({ records });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { categoryId } = body as { categoryId: string };
  await clearSearchRecords(categoryId || 'claudecode');
  return NextResponse.json({ message: 'OK' });
}
