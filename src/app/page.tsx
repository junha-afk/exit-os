// 메인 = 매물 목록 (소유: A). 랜딩은 따로 만든다.
import { headers } from 'next/headers';
import { ListingBrowser, RoleSwitcher, type ListingRow } from '@/components/common';
import { mockListing, mockListings } from '@/lib/mocks';
import { isLocked, type Provenance, type Sourced } from '@/lib/types';
import { filterListingForViewer, getViewer } from '@/lib/visibility';

// 상세 데이터가 있는 매물은 실제 필드에서 출처 개수를 센다
function trustOf(detail: object): Record<Provenance, number> {
  const count: Record<Provenance, number> = { verified: 0, user_input: 0, needs_check: 0 };
  for (const v of Object.values(detail)) {
    if (v && typeof v === 'object' && 'provenance' in v) count[(v as Sourced<unknown>).provenance]++;
  }
  return count;
}

const yearsSince = (ym: string) => new Date().getFullYear() - Number(ym.slice(0, 4));

// TODO(C): 목록 응답(ListingSummary)에 역·면적·층·소개·출처 개수가 생기면 이 보조 값과 DEMO_ROWS 를 지운다
const EXTRA: Record<string, Pick<ListingRow, 'near' | 'areaPyeong' | 'floor' | 'intro' | 'trust'>> = {
  'mock-listing-2': { near: '홍대입구역 7분', areaPyeong: 18, floor: 1, intro: '오전 매출 비중 높음, 오븐 2대 포함', trust: { verified: 14, user_input: 6, needs_check: 0 } },
  'mock-listing-3': { near: '성수역 4분', areaPyeong: 12, floor: 1, intro: '점심 회전율 높은 분식, 배달 30%', trust: { verified: 5, user_input: 13, needs_check: 2 } },
};

const DEMO_ROWS: Omit<ListingRow, 'profitLocked'>[] = [
  { id: 'demo-g', hasDetail: false, displayName: '상수동 브런치 G', industry: '카페', district: '마포구', near: '상수역 4분', openedYears: 3, premiumAsk: 85_000_000, deposit: 30_000_000, monthlyRent: 2_400_000, areaPyeong: 14, floor: 1, intro: '주말 웨이팅 있는 브런치 카페', trust: { verified: 10, user_input: 8, needs_check: 2 } },
  { id: 'demo-h', hasDetail: false, displayName: '을지로 국밥 H', industry: '음식점', district: '중구', near: '을지로3가역 2분', openedYears: 9, premiumAsk: 110_000_000, deposit: 40_000_000, monthlyRent: 2_800_000, areaPyeong: 16, floor: 1, intro: '노포 단골 상권, 레시피 전수 가능', trust: { verified: 16, user_input: 4, needs_check: 0 } },
  { id: 'demo-i', hasDetail: false, displayName: '합정동 와인바 I', industry: '주점', district: '마포구', near: '합정역 3분', openedYears: 6, premiumAsk: 90_000_000, deposit: 50_000_000, monthlyRent: 3_500_000, areaPyeong: 20, floor: 2, intro: '저녁 영업 위주, 주류 재고 포함', trust: { verified: 11, user_input: 7, needs_check: 2 } },
  { id: 'demo-j', hasDetail: false, displayName: '서촌 카페 J', industry: '카페', district: '종로구', near: '경복궁역 6분', openedYears: 2, premiumAsk: 45_000_000, deposit: 20_000_000, monthlyRent: 1_800_000, areaPyeong: 10, floor: 1, intro: '관광객 비중 높은 한옥 카페', trust: { verified: 3, user_input: 14, needs_check: 3 } },
];

export default async function Home() {
  const viewer = getViewer(new Request('http://local', { headers: await headers() }));

  // 월 이익 공개 여부는 C의 서버 필터 결과를 그대로 따른다
  const profit = filterListingForViewer(mockListing, viewer).fields.avgOperatingProfit;
  const profitLocked = isLocked(profit);

  const rows: ListingRow[] = [
    ...mockListings.map((l) => {
      const isMain = l.id === mockListing.id;
      const d = mockListing.detail;
      const extra = EXTRA[l.id];
      return {
        id: l.id,
        hasDetail: isMain,
        displayName: l.displayName,
        industry: l.industry,
        district: l.region.split(' ')[1] ?? l.region,
        near: isMain ? '망원역 5분' : extra.near,
        openedYears: yearsSince(l.openedAt),
        premiumAsk: l.premiumAsk.value,
        deposit: l.deposit.value,
        monthlyRent: l.monthlyRent.value,
        areaPyeong: isMain ? Math.round(d.areaM2.value / 3.3058) : extra.areaPyeong,
        floor: isMain ? d.floor.value : extra.floor,
        intro: isMain ? d.intro : extra.intro,
        trust: isMain ? trustOf(d) : extra.trust,
        profitLocked,
        monthlyProfit: isMain && !isLocked(profit) ? profit : undefined,
      };
    }),
    ...DEMO_ROWS.map((r) => ({ ...r, profitLocked })),
  ];

  return <ListingBrowser rows={rows} header={<RoleSwitcher current={viewer} className="hidden md:inline-flex" />} />;
}
