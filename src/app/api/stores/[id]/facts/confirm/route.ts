import { NextResponse } from 'next/server';
import { z } from 'zod';
import { confirmFact } from '@/lib/facts/repo';
import { FACT_KEYS } from '@/lib/types';

// 소유: A. POST /api/stores/:id/facts/confirm { key } — 자료에서 읽은 값 "맞아요" → 🟠 → 🔵
const Body = z.object({ key: z.enum(FACT_KEYS) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '알 수 없는 항목입니다.' }, { status: 400 });
  const ok = await confirmFact(id, parsed.data.key);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: '값이 없습니다.' }, { status: 404 });
}
