// 공개 범위 맵 + 서버 필터 (소유: C). 원본: PRD §4-E
// 매물 응답은 반드시 filterListingForViewer 를 거친다. 클라이언트에서 숨기기만 하는 방식 금지.
import type { AccessLevel, ListingDetail, ListingField, ListingView, Viewer } from './types';

// 'seller_choice' = 판매자가 public/approved 중 선택 (listings.premium_breakdown_level)
export const VISIBILITY: Record<ListingField, AccessLevel | 'seller_choice'> = {
  // 기본 정보
  displayName: 'public', industry: 'public', region: 'public', openedAt: 'public',
  intro: 'public', photos: 'public', areaM2: 'public', floor: 'public', seats: 'public',
  saleReason: 'public', desiredHandover: 'public',
  // 매각 가격
  premiumAsk: 'public', deposit: 'public', monthlyRent: 'public', maintenanceFee: 'public',
  estInitialCost: 'public', premiumBreakdown: 'seller_choice',
  // 재무 정보
  avgRevenue: 'subscriber', avgOperatingProfit: 'subscriber', margin: 'subscriber', monthlyTrend: 'subscriber',
  // 운영 정보
  openDays: 'subscriber', openHours: 'subscriber', staffCount: 'subscriber', ownerWeeklyHours: 'subscriber',
  staffRoles: 'subscriber', customerSegments: 'subscriber', channelMix: 'subscriber',
  // 시설·자산
  equipment: 'subscriber', inventoryIncluded: 'subscriber',
  // 계약 정보
  leaseExpiry: 'subscriber', renewalNeeded: 'subscriber', franchiseTerms: 'subscriber',
  // AI 분석
  scores: 'subscriber', riskFactors: 'subscriber', paybackScenarios: 'subscriber', valuation: 'subscriber',
  // 인수인계
  handoverSupport: 'subscriber', trainingWeeks: 'subscriber', suppliers: 'subscriber', digitalAccounts: 'subscriber',
};

// 구독 ≠ 승인: buyer_subscribed 는 approved 항목을 못 본다. buyer_approved 는 둘 다 본다.
const ALLOWED: Record<Viewer, AccessLevel[]> = {
  seller: ['public', 'approved', 'subscriber'],
  buyer: ['public'],
  buyer_subscribed: ['public', 'subscriber'],
  buyer_approved: ['public', 'approved', 'subscriber'],
};

export function canView(viewer: Viewer, level: AccessLevel): boolean {
  return ALLOWED[viewer].includes(level);
}

export function fieldLevel(field: ListingField, breakdownLevel: 'public' | 'approved'): AccessLevel {
  const level = VISIBILITY[field] ?? 'subscriber';
  return level === 'seller_choice' ? breakdownLevel : level;
}

export function filterListingForViewer(
  listing: { id: string; storeId: string; premiumBreakdownLevel: 'public' | 'approved'; detail: ListingDetail },
  viewer: Viewer,
): ListingView {
  const fields = {} as Record<string, unknown>;
  const lockedCount = { approved: 0, subscriber: 0 };
  for (const field of Object.keys(listing.detail) as ListingField[]) {
    const level = fieldLevel(field, listing.premiumBreakdownLevel);
    if (canView(viewer, level)) {
      fields[field] = listing.detail[field];
    } else {
      fields[field] = { locked: true, level };
      if (level !== 'public') lockedCount[level]++;
    }
  }
  return { id: listing.id, storeId: listing.storeId, viewer, fields: fields as ListingView['fields'], lockedCount };
}

const VIEWERS: Viewer[] = ['seller', 'buyer', 'buyer_subscribed', 'buyer_approved'];

// viewer = 쿠키 demo_role (없으면 x-demo-role 헤더, 그것도 없으면 buyer)
export function getViewer(req: Request): Viewer {
  const cookie = req.headers.get('cookie')?.match(/(?:^|;\s*)demo_role=([^;]+)/)?.[1];
  const role = cookie ?? req.headers.get('x-demo-role');
  return VIEWERS.includes(role as Viewer) ? (role as Viewer) : 'buyer';
}
