import { NextResponse } from 'next/server';
import { filterListingForViewer, getViewer } from '@/lib/visibility';
import { mockListing } from '@/lib/mocks';

// GET /api/listings/:id → viewer 기준 Gated 필드로 필터된 매물  (목업 데이터, 필터는 실제)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== mockListing.id) return NextResponse.json({ error: '매물을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json(filterListingForViewer(mockListing, getViewer(req)));
}
