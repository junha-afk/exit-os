# ExitOS 아키텍처 & 인터페이스 계약

> 이 문서는 **팀원 간 계약서**다. 여기 적힌 타입·API 모양을 기준으로 각자 병렬 개발하고, 바꾸려면 팀 채널에 먼저 공지한다.

## 1. 스택

| 영역 | 선택 | 메모 |
| --- | --- | --- |
| 프레임워크 | Next.js 15 App Router + TypeScript | Route Handlers(`app/api/**/route.ts`)로 API |
| UI | Tailwind + shadcn/ui + Recharts + lucide-react | |
| DB/Storage | Supabase (Postgres + Storage) | 해커톤: Auth·RLS 미사용, 서버에서 service role 키로만 접근 |
| AI | 래블업 LLM API (`src/lib/ai/llm.ts`, `fetch`) | JSON 응답 + zod 검증. 정보 수집 답변은 LLM이 해석하지 않음 |
| 파싱 | papaparse | CSV만 지원 |
| 검증 | zod | API 입력·LLM 출력 모두 |
| 배포 | Vercel | 환경변수는 `.env.example` 참고 |

## 2. 폴더 구조 (괄호 = 소유자: A 정보 수집 · B 분석·보고서 · F 플랫폼 프론트, [TEAM_PLAN.md](TEAM_PLAN.md) §2 참고)

```
exitos/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx, globals.css        # 앱 셸 (F)
│  │  ├─ page.tsx                       # 매물 목록 (F)
│  │  ├─ seller/
│  │  │  ├─ layout.tsx                  # 판매자 공통 레이아웃 (A)
│  │  │  ├─ diagnose/                   # 진단: 질문 + 숫자·선택·파일 입력 + 재무 CSV 업로드 (A)
│  │  │  ├─ report/                     # 매각 보고서 + 시뮬레이터 + 게시 폼 + 거래 성사 (B)
│  │  │  └─ knowhow/                    # 노하우 P2 (A)
│  │  ├─ listings/[id]/                 # 판매 페이지(게이팅) (F)
│  │  ├─ listings/[id]/risk/            # 구매자 리스크 보고서 화면 (F)
│  │  ├─ handover/[dealId]/             # 인수인계 대시보드 (F)
│  │  └─ api/
│  │     ├─ stores/route.ts             # (A)
│  │     ├─ stores/[id]/facts/**        # facts 조회·수정·장비 CSV (A)
│  │     ├─ stores/[id]/upload|analyze  # 재무 업로드·분석 (B)
│  │     ├─ ai/interview/               # (A)
│  │     ├─ ai/report/, ai/risk/        # (B)
│  │     └─ listings/, deals/, tasks/   # (B)
│  ├─ components/
│  │  ├─ ui/                            # shadcn 생성물 (추가는 B만)
│  │  ├─ common/                        # Metric, ProvenanceBadge, AiEstimateNotice, LockedSection, SiteHeader, routes, listing-source (F)
│  │  ├─ interview/                     # QuestionBubble, inputs/*, FactsPanel, ArtifactsPreview (A)
│  │  ├─ upload/                        # UploadPanel — 재무 CSV 업로드 (B, A의 진단 화면에 삽입)
│  │  └─ report/                        # 차트, 시뮬레이터, 게시 폼, DealButton (B)
│  └─ lib/
│     ├─ types.ts                       # 공용 타입 — 변경 시 공지 (B)
│     ├─ visibility.ts                  # 공개 범위 맵 + 필터 (B)
│     ├─ format.ts                      # formatKRW 등 (F)
│     ├─ supabase.ts                    # 서버 클라이언트 (B)
│     ├─ mocks/                         # 목업 응답 (B)
│     ├─ ai/llm.ts                      # 래블업 클라이언트 chatJson (A, B는 import만)
│     ├─ interview/                     # 슬롯·질문 엔진·프롬프트·fixtures (A)
│     ├─ facts/                         # facts 저장소·장비 CSV 가져오기 (A)
│     ├─ analysis/                      # 순수 계산 함수 (B)
│     ├─ report/                        # 보고서·리스크·이상치 설명 프롬프트·fixtures (B)
│     ├─ listing/                       # ListingDetail 생성·매물 저장소 (B)
│     └─ handover/                      # 업무 생성 규칙 (B)
├─ public/
│  ├─ stores/                           # 시연용 매장 사진 (F)
│  └─ templates/equipment.csv           # 장비 CSV 템플릿 (A)
├─ supabase/schema.sql                  # (B)
├─ data/sample/*.csv                    # 재무 데모 데이터 (B)
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

`store_facts` (A가 숫자·선택·파일 입력으로 채우는 정성 정보) 키 목록은 `src/lib/types.ts` 의 `FACT_KEYS` 상수로 관리. 값은 항상 구조화된 형태다(금액 = 원, 월 = `YYYY-MM`).

| 키 | 값 |
| --- | --- |
| `store_name` | string(30자) |
| `is_anonymous` | boolean |
| `industry`, `sale_reason` | 정해진 선택지 문자열 |
| `region` | string (`서울 마포구 망원동`) |
| `opened_at`, `desired_handover`, `lease_expiry` | `YYYY-MM` |
| `area_m2`, `floor`, `seats`, `staff_count`, `owner_weekly_hours`, `training_weeks` | number (`staff_count` = `staff_roles` 인원 합계) |
| `premium_ask`, `est_initial_cost`, `deposit`, `monthly_rent`, `maintenance_fee` | number(원) |
| `open_days` | `Weekday[]` |
| `open_hours` | `OpenHours` (`{ open, close }`, `HH:mm`) |
| `staff_roles` | `StaffRole[]` |
| `owner_tasks`, `customer_segments`, `inventory_included`, `training_items` | `string[]` (선택지) |
| `channel_mix` | `ChannelMix` (`{ hall, takeout, delivery }`, 합 100) |
| `equipment` | `Equipment[]` |
| `renewal_needed` | `boolean \| null` (null = 모름) |
| `franchise_terms` | `FranchiseTerms` |
| `handover_support` | boolean |
| `suppliers` | `Supplier[]` |
| `digital_accounts` | `DigitalAccount[]` |
| `knowhow_artifacts` | `KnowhowArtifacts` (P2) |

매장 소개(`intro`)는 facts로 받지 않는다. B의 매각 보고서 `headline`·`summary` 로 만들고 게시 폼에서 점주가 확인한다.

## 4. API 계약

모든 응답 JSON. viewer 는 쿠키 `demo_role` (없으면 `buyer`).

| 메서드 | 경로 | 소유 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| POST | `/api/stores` | A | `{ name, industry }` | `{ storeId }` |
| GET | `/api/stores/:id/facts` | A | — | `{ facts: StoreFacts }` |
| PATCH | `/api/stores/:id/facts` | A | `{ key, value }` (패널에서 수정, 슬롯별 zod 검증) | `{ ok }` 또는 `400 { error }` |
| POST | `/api/stores/:id/facts/import` | A | multipart: `kind: 'equipment'`, `file` | `{ rows, warnings[] }` |
| POST | `/api/ai/interview` | A | `{ storeId, mode: 'diagnosis'\|'knowhow', answer?: { slot, value } }` | `{ facts, question: { slot, text, input: InputSpec } \| null, ask_upload, done, progress, artifacts_preview? }` |
| POST | `/api/stores/:id/upload` | B | multipart: `kind` (pos/card_settlement/delivery/purchases/fixed/payroll), `file` | `{ rows, dedupedRows, warnings[] }` |
| POST | `/api/stores/:id/analyze` | B | — | `AnalysisResult` (이상치 설명 포함) |
| POST | `/api/ai/report` | B | `{ storeId }` | `SellerReport` (섹션별 문장) |
| POST | `/api/ai/risk` | B | `{ listingId }` | `BuyerRiskReport` (viewer가 볼 수 있는 정보만 입력으로 사용) |
| POST | `/api/listings` | B | `{ storeId, price fields, premiumBreakdownLevel }` | `{ listingId }` |
| GET | `/api/listings` | B | — | 목록(공개 필드만) |
| GET | `/api/listings/:id` | B | — | viewer 기준 `Gated` 필드로 필터된 매물 |
| POST | `/api/deals` | B | `{ listingId }` | `{ dealId }` + 인수인계 업무 자동 생성 |
| GET | `/api/deals/:id/tasks` | B | — | `{ tasks: HandoverTask[], progress, byStage, nextUp: HandoverTask[] }` |
| PATCH | `/api/tasks/:id` | B | `{ status }` | `{ ok }` |

- 인터뷰: `answer.value` 가 슬롯 스키마에 안 맞으면 `400` + 한국어 오류, 질문은 유지. `progress` 는 코드가 계산(채운 필수 슬롯 ÷ 전체). `ask_upload` = `'none' | RecordKind`. `InputSpec` 정의는 `src/lib/interview/types.ts` ([TEAM_PLAN.md](TEAM_PLAN.md) §5).
- A ↔ B 경계 함수(`chatJson`, `getFacts`, `getUploadedKinds`, `<UploadPanel>`)의 시그니처는 [TEAM_PLAN.md](TEAM_PLAN.md) §4.

**병렬 개발 규칙:** 화면은 API가 준비되기 전까지 `src/lib/mocks/*.json`·fixture 로 개발. 각 담당자는 자기 엔드포인트를 **목업 응답이라도** 먼저 열어 둔다.

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

장비 목록 (A가 처리, 재무 자료와 별도 API):

| kind | 파일 | 컬럼 |
| --- | --- | --- |
| `equipment` | `public/templates/equipment.csv` | `name,qty,year,condition,repairs,purchase_price` (repairs는 `;` 로 구분, 금액 원) |

출처 판정:
- `pos.card` 월합 ↔ `card_settlement` 월합 ±3% → 카드매출 🟢, 아니면 🟠
- `pos.cash` → 대조 출처 없음 → 🔵 (이상치면 🟠)
- `delivery` (플랫폼 정산서 자체가 원본) → 🟢
- 정보 수집 입력(숫자·선택·장비 CSV) → 🔵

## 6. 환경 변수

`.env.example` 참고. `SUPABASE_SERVICE_ROLE_KEY`, `LABLUP_API_KEY` 는 절대 커밋/클라이언트 노출 금지 (`NEXT_PUBLIC_` 접두사 금지). LLM 설정: `LABLUP_API_BASE_URL`, `LABLUP_API_KEY`, `LABLUP_MODEL`.
