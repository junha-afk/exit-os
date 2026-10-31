// 플랫폼 매물 어댑터 (F 화면 경계). B 저장소가 목업과 게시 매물을 함께 제공한다.
// 서버에서만 호출하며, 상세 원본은 viewer 필터를 거친 뒤 화면에 전달한다.
import { getListing, listListings } from '@/lib/listing/repo';
import type { ListingRecord } from '@/lib/listing/repo';
import type { ListingSummary, ListingView, Viewer } from '@/lib/types';
import { filterListingForViewer } from '@/lib/visibility';

/** 상세 데이터가 있는 매물 하나. 없으면 null */
export async function getListingRecord(id: string): Promise<ListingRecord | null> {
  return getListing(id);
}

/** 목록 카드용 공개 정보 전체 */
export async function listListingSummaries(): Promise<ListingSummary[]> {
  return listListings();
}

/** viewer 기준으로 잘린 매물. 화면은 원본 대신 항상 이것을 그린다 */
export async function getListingView(id: string, viewer: Viewer): Promise<ListingView | null> {
  const record = await getListingRecord(id);
  return record ? filterListingForViewer(record, viewer) : null;
}
