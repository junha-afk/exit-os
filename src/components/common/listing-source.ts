// 매물 데이터 출처 (소유: A). 화면은 매물 데이터를 이 파일로만 받는다. 서버에서만 호출.
// 지금은 C의 목업(@/lib/mocks)을 읽는다. C가 DB 조회 함수를 주면 이 파일 안의 구현만 바꾸면 된다.
// TODO(C): src/lib 에 getListing(id) / listListings() 서버 함수가 생기면 아래 두 함수를 그걸로 교체
import { mockListing, mockListings } from '@/lib/mocks';
import type { ListingDetail, ListingSummary, ListingView, Viewer } from '@/lib/types';
import { filterListingForViewer } from '@/lib/visibility';

/** 공개 범위 필터 전의 원본 매물 (C의 filterListingForViewer 입력 모양) */
export interface ListingRecord {
  id: string;
  storeId: string;
  premiumBreakdownLevel: 'public' | 'approved';
  detail: ListingDetail;
}

/** 상세 데이터가 있는 매물 하나. 없으면 null */
export async function getListingRecord(id: string): Promise<ListingRecord | null> {
  return id === mockListing.id ? mockListing : null;
}

/** 목록 카드용 공개 정보 전체 */
export async function listListingSummaries(): Promise<ListingSummary[]> {
  return mockListings;
}

/** viewer 기준으로 잘린 매물. 화면은 원본 대신 항상 이것을 그린다 */
export async function getListingView(id: string, viewer: Viewer): Promise<ListingView | null> {
  const record = await getListingRecord(id);
  return record ? filterListingForViewer(record, viewer) : null;
}
