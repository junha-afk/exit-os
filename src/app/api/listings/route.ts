import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getFacts } from '@/lib/facts/repo';
import { getAnalysis } from '@/lib/analysis/repo';
import { buildListingDetail } from '@/lib/listing/build';
import { listListings, upsertListing } from '@/lib/listing/repo';
import { getSellerReport } from '@/lib/report/repo';

// GET /api/listings → 목록(공개 필드만)
export async function GET() {
  return NextResponse.json({ listings: await listListings() });
}

const won = z.number().int().nonnegative();
const Body = z.object({
  storeId: z.string().min(1),
  premiumAsk: won, deposit: won, monthlyRent: won, maintenanceFee: won, estInitialCost: won,
  premiumBreakdown: z.object({ facility: won, goodwill: won, other: won }).optional(),
  premiumBreakdownLevel: z.enum(['public', 'approved']),
  intro: z.string().trim().max(600).optional(),
}).refine(
  (b) => !b.premiumBreakdown || b.premiumBreakdown.facility + b.premiumBreakdown.goodwill + b.premiumBreakdown.other === b.premiumAsk,
  { message: '권리금 구성의 합이 희망 권리금과 같아야 합니다.' },
);

// POST /api/listings → { listingId }. 같은 매장이 다시 게시하면 기존 매물을 갱신한다
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? '매물 가격 정보를 확인해 주세요.' }, { status: 400 });
  }
  const { storeId, intro, premiumBreakdownLevel, ...prices } = parsed.data;
  const [facts, analysis, report] = await Promise.all([getFacts(storeId), getAnalysis(storeId), getSellerReport(storeId)]);
  if (!analysis) return NextResponse.json({ error: '재무 자료 분석을 먼저 실행해 주세요.' }, { status: 400 });

  const detail = buildListingDetail(facts, analysis, {
    ...prices, premiumBreakdownLevel,
    intro: intro || (report ? `${report.headline}. ${report.summary}` : ''),
  });
  const listingId = await upsertListing({ storeId, premiumBreakdownLevel, detail });
  return NextResponse.json({ listingId });
}
