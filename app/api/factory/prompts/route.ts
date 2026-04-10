// app/api/factory/prompts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAllFactoryPrompts, saveFactoryPrompt } from '@/lib/db';

export async function GET() {
  return NextResponse.json({ prompts: await getAllFactoryPrompts() });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { platform, prompt } = body as { platform: string; prompt: string };
  if (!platform || prompt === undefined) {
    return NextResponse.json({ error: 'platform and prompt are required' }, { status: 400 });
  }
  await saveFactoryPrompt(platform, prompt);
  return NextResponse.json({ message: 'OK' });
}
