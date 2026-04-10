// app/api/categories/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getCategories, addCategory, removeCategory } from '@/lib/db';

export async function GET() {
  return NextResponse.json({ categories: await getCategories() });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id, name } = body as { id: string; name: string };
  if (!id || !name) {
    return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
  }
  await addCategory(id, name);
  return NextResponse.json({ message: 'OK' });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { id } = body as { id: string };
  await removeCategory(id);
  return NextResponse.json({ message: 'OK' });
}
