import { NextResponse } from 'next/server';
import { getListing } from '@/lib/listing/repo';
import { filterListingForViewer, getViewer } from '@/lib/visibility';

// GET /api/listings/:id → viewer 기준 Gated 필드로 필터된 매물
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return NextResponse.json({ error: '매물을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json(filterListingForViewer(listing, getViewer(req)));
}
