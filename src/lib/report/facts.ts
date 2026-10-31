// facts 값 읽기·한국어 표기 도우미 (소유: B). 보고서·매물 문장에서 같이 쓴다
import type {
  ChannelMix, DigitalAccount, Equipment, FactKey, FranchiseTerms, OpenHours, StaffRole, StoreFacts, Supplier, Weekday,
} from '@/lib/types';

export function fact<T>(facts: StoreFacts, key: FactKey): T | undefined {
  return facts[key]?.value as T | undefined;
}

export const factsView = (facts: StoreFacts) => ({
  storeName: fact<string>(facts, 'store_name') ?? '내 매장',
  isAnonymous: fact<boolean>(facts, 'is_anonymous') ?? false,
  industry: fact<string>(facts, 'industry') ?? '매장',
  region: fact<string>(facts, 'region') ?? '',
  openedAt: fact<string>(facts, 'opened_at') ?? '',
  saleReason: fact<string>(facts, 'sale_reason') ?? '',
  desiredHandover: fact<string>(facts, 'desired_handover') ?? '',
  premiumAsk: fact<number>(facts, 'premium_ask'),
  estInitialCost: fact<number>(facts, 'est_initial_cost'),
  deposit: fact<number>(facts, 'deposit'),
  monthlyRent: fact<number>(facts, 'monthly_rent'),
  maintenanceFee: fact<number>(facts, 'maintenance_fee'),
  openDays: fact<Weekday[]>(facts, 'open_days') ?? [],
  openHours: fact<OpenHours>(facts, 'open_hours'),
  ownerWeeklyHours: fact<number>(facts, 'owner_weekly_hours'),
  ownerTasks: fact<string[]>(facts, 'owner_tasks') ?? [],
  staffRoles: fact<StaffRole[]>(facts, 'staff_roles') ?? [],
  customerSegments: fact<string[]>(facts, 'customer_segments') ?? [],
  channelMix: fact<ChannelMix>(facts, 'channel_mix'),
  equipment: fact<Equipment[]>(facts, 'equipment') ?? [],
  inventoryIncluded: fact<string[]>(facts, 'inventory_included') ?? [],
  leaseExpiry: fact<string>(facts, 'lease_expiry') ?? '',
  renewalNeeded: fact<boolean | null>(facts, 'renewal_needed') ?? null,
  franchiseTerms: fact<FranchiseTerms>(facts, 'franchise_terms'),
  handoverSupport: fact<boolean>(facts, 'handover_support') ?? false,
  trainingWeeks: fact<number>(facts, 'training_weeks'),
  suppliers: fact<Supplier[]>(facts, 'suppliers') ?? [],
  digitalAccounts: fact<DigitalAccount[]>(facts, 'digital_accounts') ?? [],
});
export type FactsView = ReturnType<typeof factsView>;

// '서울 마포구 망원동' → '망원동'
export const neighborhood = (region: string) => region.split(' ').at(-1) ?? region;

export const staffTotal = (roles: StaffRole[]) => roles.reduce((s, r) => s + r.count, 0);

export function openDaysText(days: Weekday[]): string {
  if (days.length === 7) return '매일';
  return days.length ? days.join('·') : '';
}

export const openHoursText = (h?: OpenHours) => (h ? `${h.open}–${h.close}` : '');

export function channelMixText(mix?: ChannelMix): string {
  if (!mix) return '';
  return ([['홀', mix.hall], ['포장', mix.takeout], ['배달', mix.delivery]] as const)
    .filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}%`).join(' · ');
}

export function franchiseText(t?: FranchiseTerms): string {
  if (!t) return '';
  if (t.type === 'independent') return '개인 매장 (가맹 없음)';
  return t.monthlyRoyalty ? `프랜차이즈 (월 로열티 ${t.monthlyRoyalty.toLocaleString('ko-KR')}원)` : '프랜차이즈';
}

export function handoverSupportText(v: FactsView): string {
  if (!v.handoverSupport) return '인수인계 지원 없음';
  return v.trainingWeeks ? `인수 후 ${v.trainingWeeks}주 교육 지원` : '인수인계 지원 가능';
}

// 'YYYY-MM' 두 달 사이 개월 수 (to − from)
export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}
