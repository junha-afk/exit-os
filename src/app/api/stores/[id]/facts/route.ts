import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FACT_KEYS } from '@/lib/types';
import { mockFacts } from '@/lib/mocks';

// GET /api/stores/:id/facts → { facts }  (목업)
export async function GET() {
  return NextResponse.json({ facts: mockFacts });
}

const Body = z.object({ key: z.enum(FACT_KEYS), value: z.unknown() });

// PATCH /api/stores/:id/facts — 패널에서 직접 수정 → 사용자 입력(🔵)
export async function PATCH(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '알 수 없는 항목입니다.' }, { status: 400 });
  mockFacts[parsed.data.key] = { value: parsed.data.value, provenance: 'user_input' };
  return NextResponse.json({ ok: true });
}
