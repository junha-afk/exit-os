import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MOCK_STORE_ID } from '@/lib/mocks';

const Body = z.object({ name: z.string().min(1), industry: z.string().min(1) });

// POST /api/stores → { storeId }  (목업)
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '매장명과 업종이 필요합니다.' }, { status: 400 });
  return NextResponse.json({ storeId: MOCK_STORE_ID });
}
