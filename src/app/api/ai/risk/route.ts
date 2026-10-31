import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getListing } from '@/lib/listing/repo';
import { generateRiskReport } from '@/lib/report/prompts/risk';
import { filterListingForViewer, getViewer } from '@/lib/visibility';

const Body = z.object({ listingId: z.string().min(1) });

// POST /api/ai/risk → BuyerRiskReport. viewer 기준으로 잘린 매물만 입력으로 쓴다 (잠긴 정보는 "구독 후 확인 가능")
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'listingId 가 필요합니다.' }, { status: 400 });
  const listing = await getListing(parsed.data.listingId);
  if (!listing) return NextResponse.json({ error: '매물을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json(await generateRiskReport(filterListingForViewer(listing, getViewer(req))));
}
