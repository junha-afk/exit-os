import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MOCK_LISTING_ID, mockListings } from '@/lib/mocks';

// GET /api/listings → 목록(공개 필드만)  (목업)
export async function GET() {
  return NextResponse.json({ listings: mockListings });
}

const won = z.number().int().nonnegative();
const Body = z.object({
  storeId: z.string().min(1),
  premiumAsk: won, deposit: won, monthlyRent: won, maintenanceFee: won, estInitialCost: won,
  premiumBreakdown: z.object({ facility: won, goodwill: won, other: won }).optional(),
  premiumBreakdownLevel: z.enum(['public', 'approved']),
});

// POST /api/listings → { listingId }  (목업)
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '매물 가격 정보를 확인해 주세요.' }, { status: 400 });
  return NextResponse.json({ listingId: MOCK_LISTING_ID });
}
