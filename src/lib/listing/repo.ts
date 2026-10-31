// 매물 저장소 (소유: B). 서버에서만 호출. F는 getListing / listListings 만 import 한다 (listing-source.ts)
// 지금은 서버 메모리. 목업 매물로 시작하고, 게시하면 같은 매장의 매물을 덮어쓴다
import { mockListing, mockListings } from '@/lib/mocks';
import type { ListingDetail, ListingSummary } from '@/lib/types';

// filterListingForViewer 입력 모양 (공개 범위 필터 전 원본)
export interface ListingRecord {
  id: string;
  storeId: string;
  premiumBreakdownLevel: 'public' | 'approved';
  detail: ListingDetail;
}

const g = globalThis as typeof globalThis & {
  __exitosListings?: Map<string, ListingRecord>;
  __exitosListingOrder?: string[];
};
const records = (g.__exitosListings ??= new Map([[mockListing.id, structuredClone(mockListing)]]));
// 목록 순서 = 목업 목록 순서 (상세 없는 목업 매물은 요약만 있다)
const order = (g.__exitosListingOrder ??= mockListings.map((l) => l.id));

export async function getListing(id: string): Promise<ListingRecord | null> {
  return records.get(id) ?? null;
}

export async function getListingByStore(storeId: string): Promise<ListingRecord | null> {
  return [...records.values()].find((r) => r.storeId === storeId) ?? null;
}

function toSummary(r: ListingRecord): ListingSummary {
  const d = r.detail;
  return {
    id: r.id, displayName: d.displayName, industry: d.industry, region: d.region, openedAt: d.openedAt,
    photos: d.photos, premiumAsk: d.premiumAsk, deposit: d.deposit, monthlyRent: d.monthlyRent,
  };
}

// 목록 카드용 공개 정보만
export async function listListings(): Promise<ListingSummary[]> {
  return order.map((id) => {
    const r = records.get(id);
    return r ? toSummary(r) : mockListings.find((l) => l.id === id)!;
  });
}

// 같은 매장이 이미 게시했으면 그 매물을 갱신한다 (id 유지)
export async function upsertListing(input: Omit<ListingRecord, 'id'>): Promise<string> {
  const existing = await getListingByStore(input.storeId);
  const id = existing?.id ?? `listing-${crypto.randomUUID().slice(0, 8)}`;
  records.set(id, { id, ...input });
  if (!order.includes(id)) order.unshift(id);
  return id;
}
