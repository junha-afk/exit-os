import { NextResponse } from 'next/server';
import { z } from 'zod';
import { canView, getViewer } from '@/lib/visibility';
import { mockListing, mockRiskReport } from '@/lib/mocks';

const Body = z.object({ listingId: z.string().min(1) });

// POST /api/ai/risk → BuyerRiskReport  (목업. B-7에서 filterListingForViewer 통과 데이터 + chatJson 으로 교체)
// 목업은 구독 정보(재무·운영)를 인용하므로 구독 전 viewer 에게는 내리지 않는다.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'listingId 가 필요합니다.' }, { status: 400 });
  if (parsed.data.listingId !== mockListing.id) {
    return NextResponse.json({ error: '매물을 찾을 수 없습니다.' }, { status: 404 });
  }
  if (!canView(getViewer(req), 'subscriber')) {
    return NextResponse.json({ error: '구독 후 확인할 수 있습니다.' }, { status: 403 });
  }
  return NextResponse.json(mockRiskReport);
}
