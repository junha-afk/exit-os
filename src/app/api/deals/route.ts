import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MOCK_DEAL_ID } from '@/lib/mocks';

const Body = z.object({ listingId: z.string().min(1) });

// POST /api/deals → { dealId } + 인수인계 업무 자동 생성  (목업: 생성된 업무는 mocks/deal-tasks.json)
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'listingId 가 필요합니다.' }, { status: 400 });
  return NextResponse.json({ dealId: MOCK_DEAL_ID });
}
