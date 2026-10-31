// 매물 목록 행 만들기 (소유: A). 메인 목록과 상세의 '비슷한 매물'이 같이 쓴다. 서버에서만 호출.
// 데이터는 listing-source 로만 받는다. 상세가 있는 매물은 실제 필드에서, 없는 매물은 시연 보조값에서 채운다.
import { isLocked, type ListingDetail, type Provenance, type Sourced, type Viewer } from '@/lib/types';
import { canView, filterListingForViewer } from '@/lib/visibility';
import type { ListingRow } from './ListingBrowser';
import { getListingRecord, listListingSummaries } from './listing-source';
import { photosOf } from './store-photos';

// 출처 개수(메타 정보, 값은 노출 안 함)
function trustOf(detail: ListingDetail): Record<Provenance, number> {
  const count: Record<Provenance, number> = { verified: 0, user_input: 0, needs_check: 0 };
  for (const v of Object.values(detail)) {
    if (v && typeof v === 'object' && 'provenance' in v) count[(v as Sourced<unknown>).provenance]++;
  }
  return count;
}

const yearsSince = (ym: string) => new Date().getFullYear() - Number(ym.slice(0, 4));
const toPyeong = (m2: number) => Math.round(m2 / 3.3058);

type Supplement = Pick<ListingRow, 'near'> & Partial<Pick<ListingRow, 'areaPyeong' | 'floor' | 'intro' | 'trust'>>;

// TODO(C): ListingSummary 에 역 거리·면적·층·소개·출처 개수가 생기면 이 보조값과 DEMO_ROWS 를 지운다
const SUPPLEMENT: Record<string, Supplement> = {
  'mock-listing-1': { near: '망원역 5분' },
  'mock-listing-2': { near: '홍대입구역 7분', areaPyeong: 18, floor: 1, intro: '오전 매출 비중 높음, 오븐 2대 포함', trust: { verified: 14, user_input: 6, needs_check: 0 } },
  'mock-listing-3': { near: '성수역 4분', areaPyeong: 12, floor: 1, intro: '점심 회전율 높은 분식, 배달 30%', trust: { verified: 5, user_input: 13, needs_check: 2 } },
};

// 목록이 비어 보이지 않게 넣은 시연용 매물 (상세 없음, 클릭 불가)
const DEMO_ROWS: Omit<ListingRow, 'profitLocked'>[] = [
  { id: 'demo-g', hasDetail: false, displayName: '상수동 브런치 G', industry: '카페', district: '마포구', near: '상수역 4분', openedYears: 3, premiumAsk: 85_000_000, deposit: 30_000_000, monthlyRent: 2_400_000, areaPyeong: 14, floor: 1, intro: '주말 웨이팅 있는 브런치 카페', trust: { verified: 10, user_input: 8, needs_check: 2 } },
  { id: 'demo-h', hasDetail: false, displayName: '을지로 국밥 H', industry: '음식점', district: '중구', near: '을지로3가역 2분', openedYears: 9, premiumAsk: 110_000_000, deposit: 40_000_000, monthlyRent: 2_800_000, areaPyeong: 16, floor: 1, intro: '노포 단골 상권, 레시피 전수 가능', trust: { verified: 16, user_input: 4, needs_check: 0 } },
  { id: 'demo-i', hasDetail: false, displayName: '합정동 와인바 I', industry: '주점', district: '마포구', near: '합정역 3분', openedYears: 6, premiumAsk: 90_000_000, deposit: 50_000_000, monthlyRent: 3_500_000, areaPyeong: 20, floor: 2, intro: '저녁 영업 위주, 주류 재고 포함', trust: { verified: 11, user_input: 7, needs_check: 2 } },
  { id: 'demo-j', hasDetail: false, displayName: '서촌 카페 J', industry: '카페', district: '종로구', near: '경복궁역 6분', openedYears: 2, premiumAsk: 45_000_000, deposit: 20_000_000, monthlyRent: 1_800_000, areaPyeong: 10, floor: 1, intro: '관광객 비중 높은 한옥 카페', trust: { verified: 3, user_input: 14, needs_check: 3 } },
];

export async function buildListingRows(viewer: Viewer): Promise<ListingRow[]> {
  // 상세가 없는 매물의 월 이익은 '구독자 공개' 항목이라 viewer 권한으로만 잠금 여부를 정한다
  const subscriberLocked = !canView(viewer, 'subscriber');
  const summaries = await listListingSummaries();

  const rows = await Promise.all(
    summaries.map(async (l): Promise<ListingRow> => {
      const record = await getListingRecord(l.id);
      const extra = SUPPLEMENT[l.id] ?? { near: '' };
      const base = {
        id: l.id,
        photo: photosOf(l.id, l.photos)[0],
        displayName: l.displayName,
        industry: l.industry,
        district: l.region.split(' ')[1] ?? l.region,
        near: extra.near,
        openedYears: yearsSince(l.openedAt),
        premiumAsk: l.premiumAsk.value,
        deposit: l.deposit.value,
        monthlyRent: l.monthlyRent.value,
      };

      if (!record) {
        return {
          ...base,
          hasDetail: false,
          areaPyeong: extra.areaPyeong ?? 0,
          floor: extra.floor ?? 0,
          intro: extra.intro ?? '',
          trust: extra.trust ?? { verified: 0, user_input: 0, needs_check: 0 },
          profitLocked: subscriberLocked,
        };
      }

      // 상세가 있으면 C의 서버 필터 결과로 채운다
      const f = filterListingForViewer(record, viewer).fields;
      const profit = f.avgOperatingProfit;
      return {
        ...base,
        hasDetail: true,
        areaPyeong: isLocked(f.areaM2) ? 0 : toPyeong(f.areaM2.value),
        floor: isLocked(f.floor) ? 0 : f.floor.value,
        intro: isLocked(f.intro) ? '' : f.intro,
        trust: trustOf(record.detail),
        profitLocked: isLocked(profit),
        monthlyProfit: isLocked(profit) ? undefined : profit,
      };
    }),
  );

  return [...rows, ...DEMO_ROWS.map((r) => ({ ...r, photo: photosOf(r.id)[0], profitLocked: subscriberLocked }))];
}
