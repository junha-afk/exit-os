// 매물 저장소 (소유: B). 서버에서만 호출. F는 getListing / listListings 만 import 한다 (listing-source.ts)
// 목업 매물은 정적 데이터로 보존하고, 실제 게시 매물은 Supabase에서 읽고 쓴다.
import { mockListing, mockListings } from '@/lib/mocks';
import { ensureStoreExists, getSupabase } from '@/lib/supabase';
import type { ListingDetail, ListingSummary } from '@/lib/types';

// filterListingForViewer 입력 모양 (공개 범위 필터 전 원본)
export interface ListingRecord {
  id: string;
  storeId: string;
  premiumBreakdownLevel: 'public' | 'approved';
  detail: ListingDetail;
}

interface ListingRow {
  id: string;
  store_id: string;
  detail: ListingDetail;
  premium_breakdown_level: ListingRecord['premiumBreakdownLevel'];
}

const demoListingIds = new Set(mockListings.map((listing) => listing.id));
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getListing(id: string): Promise<ListingRecord | null> {
  if (id === mockListing.id) return { ...mockListing, detail: structuredClone(mockListing.detail) };
  if (!UUID_PATTERN.test(id)) return null;

  const { data, error } = await getSupabase()
    .from('listings')
    .select('id, store_id, detail, premium_breakdown_level')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw new Error(`SUPABASE_LISTING_READ_FAILED: ${error.message}`);
  return data ? mapListing(data as ListingRow) : null;
}

export async function getListingByStore(storeId: string): Promise<ListingRecord | null> {
  const { data, error } = await getSupabase()
    .from('listings')
    .select('id, store_id, detail, premium_breakdown_level')
    .eq('store_id', storeId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`SUPABASE_LISTING_LOOKUP_FAILED: ${error.message}`);
  if (data) return mapListing(data as ListingRow);
  return mockListing.storeId === storeId ? { ...mockListing, detail: structuredClone(mockListing.detail) } : null;
}

function toSummary(record: ListingRecord): ListingSummary {
  const detail = record.detail;
  return {
    id: record.id,
    displayName: detail.displayName,
    industry: detail.industry,
    region: detail.region,
    openedAt: detail.openedAt,
    photos: detail.photos,
    premiumAsk: detail.premiumAsk,
    deposit: detail.deposit,
    monthlyRent: detail.monthlyRent,
  };
}

// 목업 목록은 항상 유지하고 실제 매물은 앞쪽에 추가한다.
export async function listListings(): Promise<ListingSummary[]> {
  const { data, error } = await getSupabase()
    .from('listings')
    .select('id, store_id, detail, premium_breakdown_level')
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`SUPABASE_LISTINGS_READ_FAILED: ${error.message}`);

  const persistedListings = data
    .map((row) => mapListing(row as ListingRow))
    .filter((record) => !demoListingIds.has(record.id))
    .map(toSummary);
  return [...persistedListings, ...mockListings];
}

// 같은 매장이 게시한 실매물은 갱신하고, 고정된 목업 목록은 수정하지 않는다.
export async function upsertListing(input: Omit<ListingRecord, 'id'>): Promise<string> {
  await ensureStoreExists(input.storeId);
  const supabase = getSupabase();
  const { data: existing, error: lookupError } = await supabase
    .from('listings')
    .select('id')
    .eq('store_id', input.storeId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lookupError) throw new Error(`SUPABASE_LISTING_LOOKUP_FAILED: ${lookupError.message}`);

  const id = existing?.id ?? crypto.randomUUID();
  const detail = input.detail;
  const { error } = await supabase.from('listings').upsert({
    id,
    store_id: input.storeId,
    status: 'published',
    premium_ask: detail.premiumAsk.value,
    deposit: detail.deposit.value,
    monthly_rent: detail.monthlyRent.value,
    maintenance_fee: detail.maintenanceFee.value,
    est_initial_cost: detail.estInitialCost.value,
    premium_breakdown: detail.premiumBreakdown.value,
    premium_breakdown_level: input.premiumBreakdownLevel,
    detail,
  }, { onConflict: 'id' });
  if (error) throw new Error(`SUPABASE_LISTING_SAVE_FAILED: ${error.message}`);
  return id;
}

function mapListing(row: ListingRow): ListingRecord {
  return {
    id: row.id,
    storeId: row.store_id,
    premiumBreakdownLevel: row.premium_breakdown_level,
    detail: row.detail,
  };
}
