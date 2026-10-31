import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FACT_KEYS } from '@/lib/types';
import { getFacts, setFact } from '@/lib/facts/repo';

// 소유: A. facts 조회·수정
type Params = { params: Promise<{ id: string }> };

// GET /api/stores/:id/facts → { facts }
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  return NextResponse.json({ facts: await getFacts(id) });
}

// TODO(A-1): value 를 src/lib/interview/slots.ts 의 슬롯별 zod 스키마로 검증
const Body = z.object({ key: z.enum(FACT_KEYS), value: z.unknown() });

// PATCH /api/stores/:id/facts — 패널에서 직접 수정 → 사용자 입력(🔵)
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '알 수 없는 항목입니다.' }, { status: 400 });
  await setFact(id, parsed.data.key, parsed.data.value);
  return NextResponse.json({ ok: true });
}
