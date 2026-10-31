import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getFacts } from '@/lib/facts/repo';
import { enrichTasks } from '@/lib/handover/enrich';
import { generateHandoverTasks } from '@/lib/handover/generate';
import { getDealByListing, newDealId, saveDeal } from '@/lib/handover/repo';
import { getListing } from '@/lib/listing/repo';

const Body = z.object({ listingId: z.string().min(1) });

const thisMonth = () => new Date().toISOString().slice(0, 7);

// POST /api/deals → { dealId } + 인수인계 업무 자동 생성
// 같은 매물에 다시 누르면 같은 거래 id 로 업무를 새로 만든다 (데모 리허설 초기화 겸용)
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'listingId 가 필요합니다.' }, { status: 400 });
  const listing = await getListing(parsed.data.listingId);
  if (!listing) return NextResponse.json({ error: '매물을 찾을 수 없습니다.' }, { status: 404 });

  const dealId = (await getDealByListing(listing.id))?.id ?? newDealId();
  const facts = await getFacts(listing.storeId);
  const tasks = await enrichTasks(generateHandoverTasks(dealId, facts, thisMonth()), listing.detail.industry);
  await saveDeal({ id: dealId, listingId: listing.id, tasks });
  return NextResponse.json({ dealId });
}
