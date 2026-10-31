import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FACT_KEYS } from '@/lib/types';
import { getFacts, setFact } from '@/lib/facts/repo';
import { SLOT_BY_KEY, parseSlotInput } from '@/lib/interview/slots';

// 소유: A. facts 조회·수정
type Params = { params: Promise<{ id: string }> };

// GET /api/stores/:id/facts → { facts }
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  return NextResponse.json({ facts: await getFacts(id) });
}

const Body = z.object({ key: z.enum(FACT_KEYS), value: z.unknown() });

// PATCH /api/stores/:id/facts — 패널에서 직접 수정 → 사용자 입력(🔵). 진단 질문과 같은 슬롯 검증
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '알 수 없는 항목입니다.' }, { status: 400 });
  const slot = SLOT_BY_KEY[parsed.data.key];
  if (!slot) return NextResponse.json({ error: '수정할 수 없는 항목입니다.' }, { status: 400 });
  const checked = parseSlotInput(slot, parsed.data.value);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
  await setFact(id, slot.key, checked.value);
  return NextResponse.json({ ok: true, facts: await getFacts(id) });
}
