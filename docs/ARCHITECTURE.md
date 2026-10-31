# ExitOS 아키텍처 & 인터페이스 계약

> 이 문서는 **팀원 간 계약서**다. 여기 적힌 타입·API 모양을 기준으로 각자 병렬 개발하고, 바꾸려면 팀 채널에 먼저 공지한다.

## 1. 스택

| 영역 | 선택 | 메모 |
| --- | --- | --- |
| 프레임워크 | Next.js 15 App Router + TypeScript | Route Handlers(`app/api/**/route.ts`)로 API |
| UI | Tailwind + shadcn/ui + Recharts + lucide-react | |
| DB/Storage | Supabase (Postgres + Storage) | 해커톤: Auth·RLS 미사용, 서버에서 service role 키로만 접근 |
| AI | 래블업 LLM API (`src/lib/ai/llm.ts`, `fetch`) | JSON 응답 + zod 검증. 정보 수집 답변은 LLM이 해석하지 않음 |
| 파싱 | papaparse, `@e965/xlsx`, `pdfjs-dist`, `word-extractor`, `@ssabrojs/hwpxjs` | CSV·엑셀·PDF·Word·한글·사진·텍스트 |
| 검증 | zod | API 입력·LLM 출력 모두 |
| 배포 | Vercel | 환경변수는 `.env.example` 참고 |

현재 매장 facts, 업로드 파일 메타데이터, 재무 행, 게시 매물은 서버 전용 service-role 연결로 Postgres에 저장한다. 업로드한 원본 파일 바이너리는 아직 Supabase Storage에 저장하지 않는다. 기존 DB에는 `supabase/listings-detail-migration.sql`을 적용해야 한다.

## 2. 폴더 구조 (괄호 = 소유자: A 정보 수집 · B 분석·보고서 · F 플랫폼 프론트, [TEAM_PLAN.md](TEAM_PLAN.md) §2 참고)

```
exitos/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx, globals.css        # 앱 셸 (F)
│  │  ├─ page.tsx                       # 매물 목록 (F)
│  │  ├─ seller/
│  │  │  ├─ layout.tsx                  # 판매자 공통 레이아웃 (A)
│  │  │  ├─ diagnose/                   # 진단: 질문(숫자·선택 입력) + LLM이 요청한 자료 올리기 (A)
│  │  │  ├─ report/                     # 매각 보고서 + 시뮬레이터 + 게시 폼 + 거래 성사 (B)
│  │  │  └─ knowhow/                    # 노하우 P2 (A)
│  │  ├─ listings/[id]/                 # 판매 페이지(게이팅) (F)
│  │  ├─ listings/[id]/risk/            # 구매자 리스크 보고서 화면 (F)
│  │  ├─ handover/[dealId]/             # 인수인계 대시보드 (F)
│  │  └─ api/
│  │     ├─ stores/route.ts             # (A)
│  │     ├─ stores/[id]/facts/**        # facts 조회·수정·확인 (A)
│  │     ├─ stores/[id]/upload          # 자료 업로드 + LLM 읽기 (A)
│  │     ├─ stores/[id]/documents/**    # 받은 자료 목록·"없어요" (A)
│  │     ├─ stores/[id]/analyze         # 분석 (B)
│  │     ├─ ai/interview/               # (A)
│  │     ├─ ai/report/, ai/risk/        # (B)
│  │     └─ listings/, deals/, tasks/   # (B)
│  ├─ components/
│  │  ├─ ui/                            # shadcn 생성물 (추가는 B만)
│  │  ├─ common/                        # Metric, ProvenanceBadge, AiEstimateNotice, LockedSection, SiteHeader, routes, listing-source (F)
│  │  ├─ interview/                     # QuestionBubble, inputs/*, FactsPanel, ArtifactsPreview (A)
│  │  ├─ upload/                        # DocumentDrop — 자료 올리기 칸, 아무 형식 (A)
│  │  └─ report/                        # 차트, 시뮬레이터, 게시 폼, DealButton (B)
│  └─ lib/
│     ├─ types.ts                       # 공용 타입 — 변경 시 공지 (B)
│     ├─ visibility.ts                  # 공개 범위 맵 + 필터 (B)
│     ├─ format.ts                      # formatKRW 등 (F)
│     ├─ supabase.ts                    # 서버 클라이언트 (B)
│     ├─ mocks/                         # 목업 응답 (B)
│     ├─ ai/llm.ts                      # 래블업 클라이언트 chatJson (A, B는 import만)
│     ├─ interview/                     # 슬롯·진단 엔진·시스템 프롬프트·스키마·fixtures (A)
│     ├─ facts/                         # facts 저장소 (A)
│     ├─ documents/                     # 자료 종류 목록·파일 읽기·LLM 읽기·자료/재무 행 저장소 (A, B는 읽기만)
│     ├─ analysis/                      # 순수 계산 함수 (B)
│     ├─ report/                        # 보고서·리스크·이상치 설명 프롬프트·fixtures (B)
│     ├─ listing/                       # ListingDetail 생성·매물 저장소 (B)
│     └─ handover/                      # 업무 생성 규칙 (B)
├─ public/
│  └─ stores/                           # 시연용 매장 사진 (F)
├─ supabase/schema.sql                  # (B)
├─ data/sample/*.csv                    # 재무 데모 데이터 (B)
├─ data/demo-docs/                      # 데모용 자료: 임대차계약서 PDF·사진 등 (A)
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
| POST | `/api/stores/:id/facts/confirm` | A | `{ key }` (자료에서 읽은 값 "맞아요") | `{ ok }` → 🟠 → 🔵 |
| POST | `/api/ai/interview` | A | `{ storeId, mode: 'diagnosis'\|'knowhow', answer?: { slot, value } }` | `{ facts, step: { type: 'ask_slot', slot, text, input: InputSpec } \| { type: 'request_document', docKind, label, text, reason } \| null, done, progress, artifacts_preview? }` |
| POST | `/api/stores/:id/upload` | A | multipart: `file` (아무 형식, 최대 10MB), `requestedKind` (`DocKind`) | `{ document: UploadedDocument, filledFacts: { key, value, evidence }[], recordCount }` |
| GET | `/api/stores/:id/documents` | A | — | `{ documents: UploadedDocument[] }` |
| POST | `/api/stores/:id/documents/decline` | A | `{ kind }` ("이 자료는 없어요") | `{ ok }` |
| POST | `/api/stores/:id/analyze` | B | — | `AnalysisResult` (이상치 설명 포함) |
| POST | `/api/ai/report` | B | `{ storeId }` | `SellerReport` (섹션별 문장) |
| POST | `/api/ai/risk` | B | `{ listingId }` | `BuyerRiskReport` (viewer가 볼 수 있는 정보만 입력으로 사용) |
| POST | `/api/listings` | B | `{ storeId, price fields, premiumBreakdownLevel }` | `{ listingId }` |
| GET | `/api/listings` | B | — | 목록(공개 필드만) |
| GET | `/api/listings/:id` | B | — | viewer 기준 `Gated` 필드로 필터된 매물 |
| POST | `/api/deals` | B | `{ listingId }` | `{ dealId }` + 인수인계 업무 자동 생성 |
| GET | `/api/deals/:id/tasks` | B | — | `{ tasks: HandoverTask[], progress, byStage, nextUp: HandoverTask[] }` |
| PATCH | `/api/tasks/:id` | B | `{ status }` | `{ ok }` |

- 진단: `answer.value` 가 슬롯 스키마에 안 맞으면 `400` + 한국어 오류, 질문은 유지. `progress` 는 코드가 계산(채운 필수 슬롯 ÷ 전체). `InputSpec` 정의는 `src/lib/interview/types.ts` ([TEAM_PLAN.md](TEAM_PLAN.md) §5).
- 데이터는 A → B 한 방향. B가 쓰는 A의 함수(`chatJson`, `getFacts`, `getFinancialRows`, `listDocuments`)와 타입의 시그니처는 [TEAM_PLAN.md](TEAM_PLAN.md) §4.

**병렬 개발 규칙:** 화면은 API가 준비되기 전까지 `src/lib/mocks/*.json`·fixture 로 개발. 각 담당자는 자기 엔드포인트를 **목업 응답이라도** 먼저 열어 둔다.

## 5. 자료 받기와 재무 행

**받을 자료는 고정하지 않는다.** A의 진단 엔진(LLM)이 판단해 `src/lib/documents/catalog.ts` 의 `DOC_KINDS` 중에서 하나씩 요청한다. 업로드는 엑셀·CSV·PDF·Word·한글·사진·텍스트를 지원한다. 올라온 파일은 A가 읽어 저장하고, B는 저장된 결과를 읽기만 한다.

| 파일 | 읽는 방법 (A) | 결과 |
| --- | --- | --- |
| 엑셀(.xls·.xlsx)·CSV | 첫 시트/표의 열 이름·앞 20행 추출 → LLM이 열 매핑(`TABLE_MAPPING_SYSTEM_PROMPT`) → 코드가 모든 행을 읽음 | `FinancialRow[]` (`readBy: 'code_table'`) |
| PDF·Word(.doc·.docx)·한글(.hwp·.hwpx)·텍스트 | 코드가 문서 텍스트 추출 → LLM이 적힌 값을 옮겨 적음(`DOCUMENT_READ_SYSTEM_PROMPT`) | facts(🟠 + 근거 원문) + 재무 표면 `FinancialRow[]` (`readBy: 'llm_document'`) |
| 사진·스캔 | 이미지를 LLM에 그대로 전달 → 같은 프롬프트 | 위와 같음 |

- 텍스트가 없는 스캔 PDF는 "사진으로 다시 올려주세요"로 안내한다(해커톤 범위). PDF는 최대 50쪽까지 읽는다.
- LLM은 계산·합산·단위 환산을 하지 않는다. 금액의 만원·천원 → 원만 바꾸고, 그 외 단위(평 등)는 숫자와 단위를 그대로 넘겨 코드가 환산한다.
- 모든 자료는 LLM이 쓴 1~2문장 요약(`UploadedDocument.summary`, 사실만)을 남긴다.

### 재무 행 (`FinancialRow`, A가 저장 → B가 읽음)

자료 종류별 표준 칸(`DOC_KINDS[].targetFields`). 금액 = 원 단위 정수, `date` = `YYYY-MM-DD` 또는 `YYYY-MM`, `month` = `YYYY-MM`(코드가 만듦).

| kind | 표준 칸 |
| --- | --- |
| `pos` | `date, channel(card/cash), amount` |
| `card_settlement` | `date, card_company, amount` |
| `delivery` | `date, platform, gross_sales, fees, net_payout, orders, included_in_pos` |
| `purchases` | `date, vendor, category, amount` |
| `fixed` | `date, item, amount` |
| `payroll` | `date, role, hours, pay` |
| `cash_receipt` | `date, amount` |
| `bank_deposit` | `date, counterparty, amount` |

### 데모 샘플

`data/sample/` (`node data/generate-sample.mjs` 로 재생성, B 소유). 형식이 정해진 CSV라 열 매핑이 바로 맞는다. 금액 단위 = 원, 월 = `YYYY-MM`.

| kind | 파일 | 컬럼 |
| --- | --- | --- |
| `pos` | pos_sales.csv | `month,channel,amount` (channel: card/cash) |
| `card_settlement` | card_settlement.csv | `month,card_company,amount` |
| `delivery` | delivery_settlement.csv | `month,platform,gross_sales,fees,net_payout,orders,included_in_pos` |
| `purchases` | purchases.csv | `month,vendor,category,amount` |
| `fixed` | fixed_costs.csv | `month,item,amount` |
| `payroll` | payroll.csv | `month,role,hours,pay` |

데모 문서 자료(A 소유 `data/demo-docs/`): 임대차계약서(PDF·사진), 장비 구입 영수증 등. 장비·임대 조건은 이 자료를 LLM이 읽어 채운다.

출처 판정 (B의 `provenance.ts`):
- `pos.card` 월합 ↔ `card_settlement` 월합 ±3% → 카드매출 🟢, 아니면 🟠
- `pos.cash` 월합 ↔ `cash_receipt` + `bank_deposit` 월합 ±3% → 현금매출 🟢. 대조 자료가 없으면 🔵 (이상치면 🟠)
- `delivery` (플랫폼 정산서 자체가 원본) → 🟢
- `readBy: 'llm_document'` 재무 행 → 🟠에서 시작, 다른 자료와 대조되면 올린다
- 점주 입력(숫자·선택) → 🔵
- 자료에서 LLM이 읽은 facts → 🟠 (A가 저장), 점주가 패널에서 확인하면 🔵

## 6. 환경 변수

`.env.example` 참고. `SUPABASE_SERVICE_ROLE_KEY`, `LABLUP_API_KEY` 는 절대 커밋/클라이언트 노출 금지 (`NEXT_PUBLIC_` 접두사 금지). LLM 설정: `LABLUP_API_BASE_URL`, `LABLUP_API_KEY`, `LABLUP_MODEL`.
