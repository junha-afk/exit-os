# ExitOS 아키텍처 & 인터페이스 계약

> 이 문서는 **팀원 간 계약서**다. 여기 적힌 타입·API 모양을 기준으로 각자 병렬 개발하고, 바꾸려면 팀 채널에 먼저 공지한다.

## 1. 스택

| 영역 | 선택 | 메모 |
| --- | --- | --- |
| 프레임워크 | Next.js 15 App Router + TypeScript | Route Handlers(`app/api/**/route.ts`)로 API |
| UI | Tailwind + shadcn/ui + Recharts + lucide-react | |
| DB/Storage | Supabase (Postgres + Storage) | 해커톤: Auth·RLS 미사용, 서버에서 service role 키로만 접근 |
| AI | Gemini API (`@google/genai`) | 구조화 출력(JSON schema) + zod 검증 |
| 파싱 | papaparse | CSV만 지원 |
| 검증 | zod | API 입력·LLM 출력 모두 |
| 배포 | Vercel | 환경변수는 `.env.example` 참고 |

## 2. 폴더 구조 (괄호 = 소유자, [TEAM_PLAN.md](TEAM_PLAN.md) 참고)

```
exitos/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                       # 랜딩 + 매물 목록 (A)
│  │  ├─ seller/
│  │  │  ├─ diagnose/page.tsx           # 진단 인터뷰 + CSV 업로드 (B)
│  │  │  ├─ report/page.tsx             # 매각 보고서 + 시뮬레이터 (B)
│  │  │  └─ knowhow/page.tsx            # 노하우 인터뷰 P2 (B)
│  │  ├─ listings/[id]/page.tsx         # 판매 페이지(게이팅) (A)
│  │  ├─ listings/[id]/risk/page.tsx    # 구매자 리스크 보고서 (A)
│  │  ├─ handover/[dealId]/page.tsx     # 인수인계 대시보드 (A)
│  │  └─ api/                           # 전부 (C), 단 api/ai/** 는 (D)
│  ├─ components/
│  │  ├─ ui/                            # shadcn 생성물 (공용, 추가만)
│  │  ├─ common/                        # Metric, ProvenanceBadge, AiEstimateNotice, RoleSwitcher, LockedSection (A)
│  │  ├─ interview/                     # ChatPanel, ExtractedPanel (B)
│  │  └─ report/                        # 차트, 시뮬레이터 (B)
│  └─ lib/
│     ├─ types.ts                       # 공용 타입 — 변경 시 공지 (C)
│     ├─ visibility.ts                  # 공개 범위 맵 + 필터 (C)
│     ├─ format.ts                      # formatKRW 등 (A)
│     ├─ supabase.ts                    # 서버 클라이언트 (C)
│     ├─ analysis/                      # 순수 계산 함수 (C)
│     ├─ handover/                      # 업무 생성 규칙 (C)
│     └─ ai/                            # gemini.ts, prompts/, schemas/, fixtures/ (D)
├─ supabase/schema.sql                  # (C)
├─ data/sample/*.csv                    # 데모 데이터 (A가 시나리오, C가 검증)
└─ docs/
```

## 3. 공용 타입 (`src/lib/types.ts` 초안)

```ts
export type Provenance = 'verified' | 'user_input' | 'needs_check';
export type AccessLevel = 'public' | 'approved' | 'subscriber';
export type Viewer = 'seller' | 'buyer' | 'buyer_subscribed' | 'buyer_approved';

export interface Sourced<T> { value: T; provenance: Provenance; note?: string }
export type Locked = { locked: true; level: AccessLevel };
export type Gated<T> = T | Locked;

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
  aiExplanation?: string;     // Gemini가 덧붙인 설명
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

export type HandoverStage =
  | 'prep' | 'valuation' | 'buyer_search' | 'due_diligence' | 'landlord' | 'premium_contract'
  | 'lease_contract' | 'license_transfer' | 'tax_registration' | 'staff_contracts'
  | 'handover_settlement' | 'post_tax';

export interface HandoverTask {
  id: string; dealId: string; stage: HandoverStage;
  category: 'equipment' | 'supplier' | 'staff' | 'manual' | 'account' | 'contract' | 'admin';
  title: string; description?: string; checklist?: string[];
  owner: 'seller' | 'buyer' | 'both';
  priority: 'high' | 'normal';
  status: 'todo' | 'doing' | 'done' | 'blocked';
  dueDate?: string; dependsOn: string[];
}
```

`store_facts` (인터뷰로 채우는 정성 정보) 키 목록은 `src/lib/types.ts` 의 `FACT_KEYS` 상수로 관리:
`industry, region, opened_at, sale_reason, desired_handover, area_m2, floor, seats, open_days, open_hours, staff_count, owner_weekly_hours, staff_roles[], customer_segments, channel_mix, equipment[], inventory_included, lease_expiry, renewal_needed, franchise_terms, handover_support, training_weeks, suppliers[], digital_accounts[]`

## 4. API 계약

모든 응답 JSON. viewer 는 쿠키 `demo_role` (없으면 `buyer`).

| 메서드 | 경로 | 소유 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| POST | `/api/stores` | C | `{ name, industry }` | `{ storeId }` |
| GET | `/api/stores/:id/facts` | C | — | `{ facts: Record<FactKey, Sourced<any>> }` |
| PATCH | `/api/stores/:id/facts` | C | `{ key, value }` (패널에서 수정) | `{ ok }` |
| POST | `/api/stores/:id/upload` | C | multipart: `kind` (pos/card_settlement/delivery/purchases/fixed/payroll), `file` | `{ rows, dedupedRows, warnings[] }` |
| POST | `/api/stores/:id/analyze` | C | — | `AnalysisResult` (anomaly 설명은 D의 함수 호출) |
| POST | `/api/ai/interview` | D | `{ storeId, mode: 'diagnosis'\|'knowhow', answer?: string }` | `{ extracted_patch, next_question, quick_replies, done, progress }` |
| POST | `/api/ai/report` | D | `{ storeId }` | `SellerReport` (섹션별 문장) |
| POST | `/api/ai/risk` | D | `{ listingId }` | `BuyerRiskReport` (viewer가 볼 수 있는 정보만 입력으로 사용) |
| POST | `/api/listings` | C | `{ storeId, price fields, premiumBreakdownLevel }` | `{ listingId }` |
| GET | `/api/listings` | C | — | 목록(공개 필드만) |
| GET | `/api/listings/:id` | C | — | viewer 기준 `Gated` 필드로 필터된 매물 |
| POST | `/api/deals` | C | `{ listingId }` | `{ dealId }` + 인수인계 업무 자동 생성 |
| GET | `/api/deals/:id/tasks` | C | — | `{ tasks: HandoverTask[], progress, byStage, nextUp: HandoverTask[] }` |
| PATCH | `/api/tasks/:id` | C | `{ status }` | `{ ok }` |

**병렬 개발 규칙:** 프론트(A·B)는 API가 준비되기 전까지 `src/lib/mocks/*.json` 으로 개발. C는 1시간 내에 위 엔드포인트를 **목업 응답이라도** 먼저 열어 둔다.

## 5. CSV 템플릿

샘플: `data/sample/` (`node data/generate-sample.mjs` 로 재생성). 금액 단위 = 원, 월 = `YYYY-MM`.

| kind | 파일 | 컬럼 |
| --- | --- | --- |
| `pos` | pos_sales.csv | `month,channel,amount` (channel: card/cash) |
| `card_settlement` | card_settlement.csv | `month,card_company,amount` |
| `delivery` | delivery_settlement.csv | `month,platform,gross_sales,fees,net_payout,orders,included_in_pos` |
| `purchases` | purchases.csv | `month,vendor,category,amount` |
| `fixed` | fixed_costs.csv | `month,item,amount` |
| `payroll` | payroll.csv | `month,role,hours,pay` |

출처 판정:
- `pos.card` 월합 ↔ `card_settlement` 월합 ±3% → 카드매출 🟢, 아니면 🟠
- `pos.cash` → 대조 출처 없음 → 🔵 (이상치면 🟠)
- `delivery` (플랫폼 정산서 자체가 원본) → 🟢
- 인터뷰 입력 → 🔵

## 6. 환경 변수

`.env.example` 참고. `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` 는 절대 커밋/클라이언트 노출 금지 (`NEXT_PUBLIC_` 접두사 금지).
