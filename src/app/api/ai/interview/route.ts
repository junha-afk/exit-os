import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resetDocuments } from '@/lib/documents/repo';
import { resetFacts, setFact } from '@/lib/facts/repo';
import { buildTurn } from '@/lib/interview/next';
import { SLOT_BY_KEY, parseSlotInput } from '@/lib/interview/slots';
import { getInterviewState, resetInterviewState } from '@/lib/interview/state';
import { FACT_KEYS } from '@/lib/types';

// 소유: A. 진단 1턴: 답 검증·저장 → 다음 할 일(질문 / 자료 요청 / 끝)
const Body = z.object({
  storeId: z.string().min(1),
  mode: z.enum(['diagnosis', 'knowhow']).default('diagnosis'),
  answer: z.object({ slot: z.enum(FACT_KEYS), value: z.unknown() }).optional(),
  /** true 이면 이 매장의 진단을 처음부터 다시 */
  reset: z.boolean().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  const { storeId, answer, reset } = parsed.data;

  if (reset) {
    await resetFacts(storeId);
    await resetDocuments(storeId);
    resetInterviewState(storeId);
    return NextResponse.json(await buildTurn(storeId, { forceNew: true }));
  }

  if (answer) {
    const slot = SLOT_BY_KEY[answer.slot];
    if (!slot) return NextResponse.json({ error: '알 수 없는 항목입니다.' }, { status: 400 });
    const checked = parseSlotInput(slot, answer.value);
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
    await setFact(storeId, slot.key, checked.value);
    getInterviewState(storeId).history.push({ kind: 'answer', label: slot.label, display: slot.display(checked.value) });
  }

  return NextResponse.json(await buildTurn(storeId));
}
