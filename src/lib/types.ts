// 공용 타입 — 팀원 간 계약서. 변경 시 팀 채널에 먼저 공지 (소유: B)
// 원본: docs/ARCHITECTURE.md §3

export type Provenance = 'verified' | 'user_input' | 'needs_check';
export type AccessLevel = 'public' | 'approved' | 'subscriber';
export type Viewer = 'seller' | 'buyer' | 'buyer_subscribed' | 'buyer_approved';

export interface Sourced<T> { value: T; provenance: Provenance; note?: string }
export type Locked = { locked: true; level: AccessLevel };
export type Gated<T> = T | Locked;

export const isLocked = (v: unknown): v is Locked =>
  typeof v === 'object' && v !== null && (v as Locked).locked === true;

// ── 매장 정성 정보 (store_facts) ────────────────────────────────
// A(정보 수집)가 숫자·선택·파일 입력으로만 채운다. 값은 항상 구조화된 형태 (docs/TEAM_PLAN.md §7).
// 금액 = 원, 월 = 'YYYY-MM'.

export const FACT_KEYS = [
  // 기본 정보
  'store_name', 'is_anonymous', 'industry', 'region', 'opened_at', 'sale_reason', 'desired_handover',
  'area_m2', 'floor', 'seats',
  // 매각 가격·임대 조건
  'premium_ask', 'est_initial_cost', 'deposit', 'monthly_rent', 'maintenance_fee',
  // 운영
  'open_days', 'open_hours',
  'staff_count', 'owner_weekly_hours', 'staff_roles', 'owner_tasks',
  'customer_segments', 'channel_mix', 'equipment', 'inventory_included',
  // 계약
  'lease_expiry', 'renewal_needed', 'franchise_terms',
  // 인수인계·노하우
  'handover_support', 'training_weeks', 'suppliers', 'digital_accounts',
  'training_items', 'knowhow_artifacts',
] as const;
export type FactKey = (typeof FACT_KEYS)[number];

export type Weekday = '월' | '화' | '수' | '목' | '금' | '토' | '일';
export interface OpenHours { open: string; close: string }            // 'HH:mm'
export interface ChannelMix { hall: number; takeout: number; delivery: number }  // 합 100 (%)
export interface FranchiseTerms { type: 'independent' | 'franchise'; monthlyRoyalty?: number }

export interface StaffRole { role: string; count: number; weeklyHours?: number; duties?: string[] }
export interface Equipment {
  name: string; qty: number; year: number;
  condition?: string; repairs?: string[];
  purchasePrice?: number;      // 원. 시설권리금(정액법 5년) 계산용
}
export interface Supplier { name: string; item: string; orderCycle?: string }
export interface DigitalAccount { platform: string; kind: 'delivery' | 'pos' | 'sns' | 'map' | 'other' }

// 노하우 산출물 (P2). 점주가 고른 항목으로 LLM이 문장을 만들고 점주가 확인한다.
export interface KnowhowArtifacts {
  roleManual: { role: string; duties: string[] }[];
  trainingChecklist: string[];
  ownerBurdenSummary: string;
  supplierHandover: { name: string; item: string; orderCycle?: string }[];
}

export type StoreFacts = Partial<Record<FactKey, Sourced<unknown>>>;

// ── 재무 분석 ────────────────────────────────────────────────

export type RecordKind = 'pos' | 'card_settlement' | 'delivery' | 'purchases' | 'fixed' | 'payroll';
export const RECORD_KINDS: RecordKind[] = ['pos', 'card_settlement', 'delivery', 'purchases', 'fixed', 'payroll'];

export interface MonthlyMetric {
  month: string;              // '2026-08'
  revenue: Sourced<number>;   // 중복 제거 후 총매출
  posCard: number; posCash: number; delivery: number;
  dedupedAmount: number;      // 이 달에 제거된 중복 금액
  cogs: number; labor: number; fixed: number; fees: number;
  operatingProfit: Sourced<number>;
}

export interface Anomaly {
  month?: string;
  kind: 'revenue_spike' | 'revenue_drop' | 'cash_ratio' | 'settlement_mismatch' | 'cogs_ratio' | 'missing';
  severity: 'low' | 'medium' | 'high';
  detail: string;             // 코드가 만든 사실 문장
  aiExplanation?: string;     // LLM이 덧붙인 설명
}

export interface Scores { revenueStability: number; dataCompleteness: number; ownerDependency: number }

export interface Valuation {
  premiumLow: number; premiumHigh: number;           // 권리금 추정 범위
  goodwillLow: number; goodwillHigh: number;         // 영업권리금
  facilityValue: number;                             // 시설권리금(잔존가치)
  monthlyProfitP25: number; monthlyProfitMedian: number; monthlyProfitP75: number;
  adjustedMonthlyProfit: number;                     // 점주 인건비 차감
}

export interface AnalysisResult {
  storeId: string;
  months: MonthlyMetric[];
  avgRevenue: Sourced<number>;
  avgOperatingProfit: Sourced<number>;
  margin: number;
  dedupeCount: number;
  anomalies: Anomaly[];
  missing: string[];          // '2026-03 원재료 매입' 등
  scores: Scores;
  valuation: Valuation;
}

export interface UploadResult { rows: number; dedupedRows: number; warnings: string[] }

// ── 매물 (판매 페이지) ─────────────────────────────────────────
// 필드별 공개 범위는 src/lib/visibility.ts 의 VISIBILITY 에서만 정의한다.

export interface PremiumBreakdown { facility: number; goodwill: number; other: number }
export interface PaybackScenario { label: '보수' | '기준' | '낙관'; monthlyProfit: number; months: number }

export interface ListingDetail {
  // 기본 정보
  displayName: string;        // 익명이면 "망원동 카페 A"
  industry: string;
  region: string;
  openedAt: string;           // 'YYYY-MM'
  intro: string;
  photos: string[];
  areaM2: Sourced<number>;
  floor: Sourced<number>;
  seats: Sourced<number>;
  saleReason: string;
  desiredHandover: string;    // 'YYYY-MM'
  // 매각 가격
  premiumAsk: Sourced<number>;
  deposit: Sourced<number>;
  monthlyRent: Sourced<number>;
  maintenanceFee: Sourced<number>;
  estInitialCost: Sourced<number>;
  premiumBreakdown: Sourced<PremiumBreakdown>;
  // 재무 정보
  avgRevenue: Sourced<number>;
  avgOperatingProfit: Sourced<number>;
  margin: Sourced<number>;
  monthlyTrend: MonthlyMetric[];
  // 운영 정보
  openDays: string;
  openHours: string;
  staffCount: Sourced<number>;
  ownerWeeklyHours: Sourced<number>;
  staffRoles: StaffRole[];
  customerSegments: string;
  channelMix: string;
  // 시설·자산
  equipment: Equipment[];
  inventoryIncluded: string;
  // 계약 정보
  leaseExpiry: string;        // 'YYYY-MM'
  renewalNeeded: boolean;
  franchiseTerms: string;
  // AI 분석
  scores: Scores;
  riskFactors: Anomaly[];
  paybackScenarios: PaybackScenario[];
  valuation: Valuation;
  // 인수인계
  handoverSupport: string;
  trainingWeeks: Sourced<number>;
  suppliers: Supplier[];
  digitalAccounts: DigitalAccount[];
}

export type ListingField = keyof ListingDetail;

// viewer 기준으로 필터된 매물 (GET /api/listings/:id 응답)
export interface ListingView {
  id: string;
  storeId: string;
  viewer: Viewer;
  fields: { [K in ListingField]: Gated<ListingDetail[K]> };
  lockedCount: { approved: number; subscriber: number };  // "구독하면 볼 수 있는 항목 N개"
}

// 목록 카드 (GET /api/listings 응답) — 공개 필드만
export interface ListingSummary {
  id: string;
  displayName: string;
  industry: string;
  region: string;
  openedAt: string;
  photos: string[];
  premiumAsk: Sourced<number>;
  deposit: Sourced<number>;
  monthlyRent: Sourced<number>;
}

// ── 인수인계 ────────────────────────────────────────────────

export type HandoverStage =
  | 'prep' | 'valuation' | 'buyer_search' | 'due_diligence' | 'landlord' | 'premium_contract'
  | 'lease_contract' | 'license_transfer' | 'tax_registration' | 'staff_contracts'
  | 'handover_settlement' | 'post_tax';

export const HANDOVER_STAGES: { stage: HandoverStage; label: string }[] = [
  { stage: 'prep', label: '양도 준비' },
  { stage: 'valuation', label: '가치 산정' },
  { stage: 'buyer_search', label: '양수자 탐색' },
  { stage: 'due_diligence', label: '정보 공개·실사' },
  { stage: 'landlord', label: '임대인 협의' },
  { stage: 'premium_contract', label: '권리금 계약' },
  { stage: 'lease_contract', label: '임대차 계약' },
  { stage: 'license_transfer', label: '영업 인허가(지위승계)' },
  { stage: 'tax_registration', label: '사업자등록·세무' },
  { stage: 'staff_contracts', label: '직원·계약 정리' },
  { stage: 'handover_settlement', label: '인수인계·정산' },
  { stage: 'post_tax', label: '사후 세금 신고' },
];

export interface HandoverTask {
  id: string; dealId: string; stage: HandoverStage;
  category: 'equipment' | 'supplier' | 'staff' | 'manual' | 'account' | 'contract' | 'admin';
  title: string; description?: string; checklist?: string[];
  owner: 'seller' | 'buyer' | 'both';
  priority: 'high' | 'normal';
  status: 'todo' | 'doing' | 'done' | 'blocked';
  dueDate?: string; dependsOn: string[];
}

export interface StageProgress { stage: HandoverStage; total: number; done: number }

// GET /api/deals/:id/tasks 응답
export interface DealTasksResponse {
  tasks: HandoverTask[];
  progress: number;           // 0~1, done ÷ 전체
  byStage: StageProgress[];
  nextUp: HandoverTask[];     // dependsOn 이 모두 done 이고 status ≠ done
}
