import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mockSellerReport } from '@/lib/mocks';

const Body = z.object({ storeId: z.string().min(1) });

// POST /api/ai/report → SellerReport  (목업. B-4에서 chatJson 으로 교체)
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'storeId 가 필요합니다.' }, { status: 400 });
  return NextResponse.json(mockSellerReport);
}
