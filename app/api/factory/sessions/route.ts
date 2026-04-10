// app/api/factory/sessions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createFactorySession, getFactorySessions, deleteFactorySession, getFactorySessionOutputs, saveFactoryOutputs } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (sessionId) {
    const outputs = await getFactorySessionOutputs(sessionId);
    return NextResponse.json({ outputs });
  }

  const sessions = await getFactorySessions(50);
  const formatted = sessions.map((s: any) => ({
    id: s.id,
    input: s.input.slice(0, 60) + (s.input.length > 60 ? '...' : ''),
    platforms: JSON.parse(s.selected_platforms),
    created_at: s.created_at,
  }));
  return NextResponse.json({ sessions: formatted });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { input, twitterMode, platforms } = body as { input: string; twitterMode: string; platforms: string[] };
  if (!input || !platforms?.length) {
    return NextResponse.json({ error: 'input and platforms are required' }, { status: 400 });
  }
  const id = uuidv4().slice(0, 12);
  await createFactorySession(id, input, twitterMode || 'single', platforms);
  return NextResponse.json({ sessionId: id });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { sessionId } = body as { sessionId: string };
  await deleteFactorySession(sessionId);
  return NextResponse.json({ message: 'OK' });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { sessionId, platform, content } = body as { sessionId: string; platform: string; content: string };
  if (!sessionId || !platform || content === undefined) {
    return NextResponse.json({ error: 'sessionId, platform, and content are required' }, { status: 400 });
  }
  await saveFactoryOutputs(sessionId, { [platform]: content });
  return NextResponse.json({ message: 'OK' });
}
