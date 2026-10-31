import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createStore } from '@/lib/facts/repo';
import { storeIdFromRequest } from '@/lib/store-session';

// 소유: A
const Body = z.object({ name: z.string().min(1).max(30), industry: z.string().min(1) });

// POST /api/stores → { storeId }. 매장 = 이 브라우저의 store_id 쿠키 (/seller 방문 때 발급)
export async function POST(req: Request) {
  const storeId = storeIdFromRequest(req);
  if (!storeId) return NextResponse.json({ error: '내 가게 팔기 화면에서 시작해 주세요.' }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '매장명과 업종이 필요합니다.' }, { status: 400 });
  return NextResponse.json({ storeId: await createStore(storeId, parsed.data) });
}
