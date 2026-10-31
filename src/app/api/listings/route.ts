import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getFacts } from '@/lib/facts/repo';
import { runAnalysis } from '@/lib/analysis/run';
import { buildListingDetail } from '@/lib/listing/build';
import { listListings, upsertListing } from '@/lib/listing/repo';
import { fallbackSellerReport } from '@/lib/report/prompts/seller';
import { getSellerReport } from '@/lib/report/repo';
import { forbidOtherStore } from '@/lib/store-session';

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
  const denied = forbidOtherStore(req, storeId);
  if (denied) return denied;
  const [facts, analysis] = await Promise.all([getFacts(storeId), runAnalysis(storeId)]);
  if (!analysis) return NextResponse.json({ error: 'POS 매출이나 배달앱 정산 자료를 먼저 올려주세요.' }, { status: 400 });
  // 보고서 화면을 거치지 않고 게시해도 소개 문구가 비지 않게 코드 폴백을 쓴다 (게시가 LLM을 기다리지 않게)
  const report = (await getSellerReport(analysis)) ?? fallbackSellerReport(analysis, facts);

  const detail = buildListingDetail(facts, analysis, {
    ...prices, premiumBreakdownLevel,
    intro: intro || `${report.headline}. ${report.summary}`,
  });
  const listingId = await upsertListing({ storeId, premiumBreakdownLevel, detail });
  return NextResponse.json({ listingId });
}
