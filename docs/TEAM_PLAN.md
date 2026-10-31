# ExitOS 해커톤 팀 플랜 v2

> v1(4역할 A·B·C·D)을 대체한다. 플랫폼 프론트는 이미 만들어져 있으므로, 남은 기능을 **A(정보 수집)** 와 **B(분석·보고서·나머지)** 로 나눈다.
> 기존 플랫폼 프론트 담당은 **F** 로 부른다(이전 문서·커밋의 `[A]` = 지금의 F). 이전 `[C]` 작업은 B가 이어받는다.

## 0. 한눈에 보기

| 역할 | 한 줄 정의 | 만드는 화면 | 만드는 서버 기능 |
| --- | --- | --- | --- |
| **A. 정보 수집** | 챗봇이 질문하고, 점주는 **숫자·선택·파일로만** 답해 `store_facts` 를 채운다 | `/seller/diagnose`, `/seller/knowhow` | 래블업 LLM 클라이언트, 질문 엔진(진단·노하우), 매장·facts API, 장비 CSV 가져오기 |
| **B. 분석·보고서** | `store_facts` + 재무 CSV로 숫자·보고서·매물·인수인계를 만든다 | `/seller/report` (+ 게시 폼, 거래 성사 버튼) | 재무 CSV 업로드·분석, 매각 보고서, 매물 게시·조회, 구매자 리스크 보고서, deal·인수인계 업무 생성 |
| **F. 플랫폼 프론트(기존)** | 이미 만든 화면 유지 | `/`, `/listings/**`, `/handover/**` | 없음 (B의 데이터 함수만 호출) |

**경계 원칙:** A는 "사실(facts)을 모으는 쪽", B는 "사실과 숫자를 쓰는 쪽"이다. A↔B 사이에는 §4의 함수 4개만 오간다. 그 외에는 서로의 파일을 import 하지도, 수정하지도 않는다.

---

## 1. A의 입력 방식: 자연어 금지

**점주는 문장으로 답하지 않는다.** 진단 화면에 자유 입력 채팅창이 없다. 챗봇 말풍선 아래에 그 질문에 맞는 입력 도구 하나가 뜨고, 점주는 그것으로만 답한다.

| 입력 종류 (`InputSpec.type`) | 화면 | 예 |
| --- | --- | --- |
| `number` | 숫자 칸 + 단위 표시 | 보증금 `5,000` 만원, 좌석 `22` 석 |
| `money` | 숫자 칸(만원) → 코드가 원으로 변환 | 희망 권리금 `16,000` 만원 → 160,000,000 |
| `month` | 연·월 선택 | 개업 `2022-09`, 임대차 만료 `2027-06` |
| `choice` | 버튼 중 하나 | 업종: 카페 / 음식점 / 베이커리 / 주점 / 분식 / 기타 |
| `multi` | 체크 여러 개 | 영업 요일, 디지털 계정(배민·쿠팡이츠·토스플레이스…) |
| `boolean` | 예 / 아니오 (/ 모름) | 익명 공개, 갱신 협의 필요 |
| `percent_split` | 합 100%가 되는 숫자 칸들 | 판매 채널: 홀 60 / 포장 25 / 배달 15 |
| `table` | 행 추가형 표 (칸마다 숫자·선택) | 직원: 역할(선택)·인원·주당 시간 |
| `file` | CSV 업로드 | 장비 목록 `equipment.csv`, 재무 자료 6종(B의 `UploadPanel`) |

- **유일한 예외:** 매장명·동 이름·거래처명 같은 **고유명사 칸**은 짧은 텍스트 칸을 허용한다(최대 30자, 문장 해석 없음).
- **값 검증은 코드가 한다.** 슬롯마다 zod 스키마(`slots.ts`)로 검사하고, 틀리면 입력 칸 아래에 오류를 표시한다. LLM은 점주의 답을 읽거나 해석하지 않는다.
- 저장되는 값의 출처는 항상 `user_input`(🔵), 장비 CSV도 `user_input`. `verified` 판정은 B의 `provenance.ts` 만.

### LLM이 맡는 일 (A 범위)

1. **다음 질문 고르기:** 이미 채운 facts, 남은 슬롯, 업로드된 재무 자료를 보고 지금 물어볼 슬롯 하나를 고른다.
2. **질문 문장 쓰기:** 존댓말 40자 내외. 예: "매장 임대보증금은 얼마인가요?"
3. **업종별 선택지 만들기:** `choice`·`multi` 중 선택지가 업종마다 다른 슬롯(점주 전담 업무, 주요 고객층, 양도 포함 품목, 노하우 직무)의 보기 4~8개.
4. **노하우 산출물 문장:** 점주가 고른 항목으로 역할 매뉴얼·교육 체크리스트·운영 부담 요약·공급망 인계 목록 문장 생성(P2).

**LLM이 실패해도 인터뷰는 멈추지 않는다:** `slots.ts` 의 기본 순서·기본 질문 문구·기본 선택지로 바로 넘어간다.

### 슬롯별 입력 방식 (진단)

| 순서 | 슬롯 | 입력 | 비고 |
| --- | --- | --- | --- |
| 1 | `store_name`, `is_anonymous` | 고유명사 칸, boolean | |
| 2 | `industry` | choice | |
| 3 | `region` | choice(구) + 고유명사 칸(동) | |
| 4 | `opened_at` | month | |
| 5 | `sale_reason` | choice: 해외 이주 / 건강 / 업종 전환 / 수익 악화 / 기타 | |
| 6 | `desired_handover` | month | |
| 7 | `premium_ask`, `est_initial_cost` | money | |
| 8 | `deposit`, `monthly_rent`, `maintenance_fee` | money | |
| 9 | `lease_expiry`, `renewal_needed` | month, boolean(+모름) | |
| 10 | (재무 자료 요청) | file → B의 `UploadPanel` | `ask_upload` |
| 11 | `area_m2`, `floor`, `seats` | number (면적은 평 입력 시 ㎡ 변환) | |
| 12 | `open_days`, `open_hours` | multi(요일), 시각 2개 선택 | |
| 13 | `owner_weekly_hours` | number | 운영 의존도 점수 입력값 |
| 14 | `staff_roles` (→ `staff_count` 자동 합계) | table: 역할(choice)·인원·주당 시간 | |
| 15 | `owner_tasks` | multi (LLM 업종별 보기) | |
| 16 | `customer_segments`, `channel_mix` | multi, percent_split | |
| 17 | `equipment` | file(`equipment.csv`) 또는 table | 컬럼: `name,qty,year,condition,repairs,purchase_price` |
| 18 | `inventory_included` | multi (LLM 업종별 보기) | |
| 19 | `franchise_terms` | choice(개인/프랜차이즈) + money(월 로열티) | |
| 20 | `suppliers` | table: 거래처명·품목(choice)·발주 주기(choice) | |
| 21 | `digital_accounts` | multi | |
| 22 | `handover_support`, `training_weeks` | boolean, number | |

`staff_count` 는 표의 인원 합계로 코드가 채운다(따로 묻지 않음). 순서는 기본값이고, LLM이 업로드 상황에 따라 바꿀 수 있다.

---

## 2. 파일 소유권 (경로 단위)

규칙: **표에 적힌 담당자만 수정한다.** 표에 없는 새 파일은 자기 소유 폴더 안에만 만든다. 남의 파일이 바뀌어야 하면 채널에 "파일·바꿀 내용"을 적어 요청한다.

### A 소유

| 경로 | 내용 |
| --- | --- |
| `src/lib/ai/llm.ts` | 래블업 API 클라이언트 `chatJson()` (B도 import만 함) |
| `src/lib/interview/**` | `types.ts`(`InputSpec`, `Question`), `slots.ts`(슬롯별 입력 방식·zod·기본 질문·기본 선택지·순서), `prompts.ts`, `schemas.ts`, `next.ts`(다음 질문 결정 + 폴백), `progress.ts`, `fixtures/*.json` |
| `src/lib/facts/**` | `repo.ts` — `getFacts` / `setFact` / `createStore`, `importEquipmentCsv.ts` |
| `src/app/api/ai/interview/route.ts` | 인터뷰 1턴 API |
| `src/app/api/stores/route.ts` | 매장 생성 (기존 목업 → A가 인수) |
| `src/app/api/stores/[id]/facts/**` | facts 조회·수정, `import/route.ts`(장비 CSV) |
| `src/app/seller/layout.tsx` | 판매자 공통 레이아웃(SiteHeader `active="sell"` + 단계 표시 진단→보고서→게시) |
| `src/app/seller/diagnose/**` | 진단 페이지 (질문·입력 좌 / 채워진 정보 패널 우 / 업로드 영역) |
| `src/app/seller/knowhow/**` | 노하우 페이지 (P2) |
| `src/components/interview/**` | `QuestionBubble`, `inputs/{Number,Money,Month,Choice,Multi,Boolean,PercentSplit,Table,File}Input.tsx`, `FactsPanel`, `ArtifactsPreview` |
| `public/templates/equipment.csv` | 장비 CSV 템플릿 겸 데모 파일 |
| `.env.example` | LLM 관련 변수 (PR-0에서만 수정) |
| `docs/AI_PROMPTS.md` §공통·§1·§2 | 공통 래퍼, 진단·노하우 질문 프롬프트 |

### B 소유

| 경로 | 내용 |
| --- | --- |
| `src/lib/types.ts`, `src/lib/visibility.ts` | 공용 계약. **PR-0 이후 변경은 공지 필수** |
| `src/lib/supabase.ts` | 서버 클라이언트 |
| `src/lib/mocks/**` | 목업 JSON·index (A도 읽기만 함) |
| `src/lib/analysis/**` | `parse.ts`, `dedupe.ts`, `provenance.ts`, `metrics.ts`, `anomalies.ts`, `scores.ts`, `valuation.ts`, `payback.ts`, `repo.ts` |
| `src/lib/report/**` | 판매자 보고서·리스크 보고서·이상치 설명 프롬프트/스키마/fixture, `types.ts`(`SellerReport`, `BuyerRiskReport`) |
| `src/lib/listing/**` | `build.ts`(facts+분석+보고서 → `ListingDetail`), `repo.ts`(`getListing`, `listListings`, `createListing`) |
| `src/lib/handover/**` | `generate.ts`(결정론 규칙), `enrich.ts`(LLM 보강), `progress.ts`(기존) |
| `src/app/api/stores/[id]/upload/**`, `src/app/api/stores/[id]/analyze/**` | 재무 업로드·분석 |
| `src/app/api/ai/report/**`, `src/app/api/ai/risk/**` | 보고서 생성 |
| `src/app/api/listings/**`, `src/app/api/deals/**`, `src/app/api/tasks/**` | 매물·거래·업무 |
| `src/app/seller/report/**` | 보고서 화면, 시뮬레이터, 게시 폼, 거래 성사 버튼 |
| `src/components/report/**` | 차트, 점수 카드, 가치 범위, `PaybackSimulator`, `PublishForm`, `DealButton`, 인쇄 레이아웃·결제 모달(P2) |
| `src/components/upload/**` | `UploadPanel` (A의 진단 페이지에 끼워 넣는 재무 CSV 업로드) |
| `supabase/**`, `data/**` | 스키마, 재무 샘플 CSV |
| `package.json`, `package-lock.json`, `next.config.*`, `components.json` | **`npm i`·`npx shadcn add` 는 B만 실행** |
| `docs/AI_PROMPTS.md` §3~§6 | 이상치·보고서·리스크·인수인계 프롬프트 |

### F 소유 (기존, A·B는 수정 금지)

`src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/app/listings/**`(리스크 보고서 페이지 포함), `src/app/handover/**`, `src/components/common/**`(`routes.ts`, `listing-source.ts` 포함), `src/lib/format.ts`, `public/stores/**`, `DESIGN.md`, `docs/DEMO_SCRIPT.md`, `docs/A_HANDOFF.md`

- A·B는 `@/components/common`(`Metric`, `ProvenanceBadge`, `AiEstimateNotice`, `LockedSection`, `SiteHeader`)과 `@/lib/format` 을 **import 만** 한다. 화면은 `DESIGN.md` 를 따른다.
- `src/components/ui/**`(shadcn): 새 컴포넌트 추가는 B가 `npx shadcn add` 로만. 기존 파일 수정 금지.

### 문서

| 파일 | 담당 |
| --- | --- |
| `docs/TEAM_PLAN.md`, `docs/ARCHITECTURE.md`, `PRD.md`, `CLAUDE.md`, `.claude/skills/exitos/SKILL.md` | 이 플랜 확정 직후 **문서 PR 1개**로 한 사람이 일괄 수정. 이후 변경은 공지 후 해당 섹션 담당자 |
| `docs/AI_PROMPTS.md` | 섹션별: §공통·1·2 = A, §3~6 = B |

---

## 3. 데이터 흐름

```
[A] /seller/diagnose
     질문 말풍선 + 입력 도구(숫자/선택/파일)
        │ { slot, value }
        ▼
[A] POST /api/ai/interview ── zod 검증(slots.ts) ──▶ [A] facts repo (store_facts, 🔵)
        │                    다음 질문: LLM(폴백: 기본 순서)   ▲
        │                       ▲ getUploadedKinds() ◀── [B]  │
        │ (B의 UploadPanel 삽입)                               │
        ▼                                                    │
[B] POST /api/stores/:id/upload ──▶ [B] financial_records     │
                                          │                  │
[B] POST /api/stores/:id/analyze ◀── getFacts() ─────────────┘
        │  AnalysisResult (+ 이상치 AI 설명)
        ▼
[B] POST /api/ai/report ──▶ SellerReport ──▶ [B] /seller/report (시뮬레이터, 게시 폼)
        │
[B] POST /api/listings ──▶ buildListingDetail() ──▶ [B] listing repo
        │                                              │ getListing()/listListings()
        ▼                                              ▼
[B] POST /api/ai/risk ◀── filterListingForViewer   [F] listing-source.ts → /, /listings/:id, /listings/:id/risk
        │
[B] POST /api/deals ──▶ generate.ts(+enrich) ──▶ handover_tasks ──▶ [F] /handover/:dealId
```

---

## 4. A ↔ B 경계 계약 (PR-0에서 시그니처 고정, 구현은 각자)

| 함수 / 컴포넌트 | 위치(소유) | 쓰는 사람 | 시그니처 |
| --- | --- | --- | --- |
| `chatJson` | `src/lib/ai/llm.ts` (A) | A, B | `chatJson<T>(opts: { system: string; user: string; schema: z.ZodType<T>; fixture?: T; temperature?: number }): Promise<T>` · `DEMO_MODE=true` 이고 `fixture` 가 있으면 그대로 반환 · zod 실패 시 1회 재시도 후 `throw new Error('AI_SCHEMA_FAIL')` |
| `getFacts` | `src/lib/facts/repo.ts` (A) | B | `getFacts(storeId: string): Promise<StoreFacts>` · PR-0 구현은 `mockFacts` 반환 |
| `getUploadedKinds` | `src/lib/analysis/repo.ts` (B) | A | `getUploadedKinds(storeId: string): Promise<RecordKind[]>` · PR-0 구현은 `[]` 반환 |
| `<UploadPanel>` | `src/components/upload/UploadPanel.tsx` (B) | A | `{ storeId: string; highlight?: RecordKind; onUploaded?: (kind: RecordKind, r: UploadResult) => void }` · PR-0은 6종 파일 선택 버튼만 있는 껍데기 |

- **facts 쓰기는 A만.** B는 facts를 읽기만 하고, 분석 결과는 `AnalysisResult` 로만 낸다.
- facts 값은 **항상 구조화된 값**(숫자·원 단위 금액·`YYYY-MM`·정해진 선택지 문자열·배열·객체)이다. B는 자연어 문장을 해석할 필요가 없다.
- 재무 CSV(6종)는 B, 장비 CSV는 A가 처리한다. 둘은 다른 API로 올라간다.
- 매장 id: 데모는 `MOCK_STORE_ID` 하나. `POST /api/stores` 가 실제 id를 만들기 전까지 양쪽 모두 이 값을 쓴다.

---

## 5. API 소유·계약

viewer = 쿠키 `demo_role` (없으면 `buyer`). 모든 LLM 호출은 서버에서만.

| 메서드 | 경로 | 소유 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| POST | `/api/stores` | A | `{ name, industry }` | `{ storeId }` |
| GET | `/api/stores/:id/facts` | A | — | `{ facts: StoreFacts }` |
| PATCH | `/api/stores/:id/facts` | A | `{ key, value }` (패널에서 수정, 같은 zod 검증) | `{ ok }` 또는 `400 { error }` |
| POST | `/api/stores/:id/facts/import` | A | multipart `kind: 'equipment'`, `file` | `{ rows, warnings[] }` |
| POST | `/api/ai/interview` | A | `{ storeId, mode: 'diagnosis'\|'knowhow', answer?: { slot, value } }` | `{ facts, question: { slot, text, input: InputSpec } \| null, ask_upload, done, progress, artifacts_preview? }` |
| POST | `/api/stores/:id/upload` | B | multipart `kind`, `file` | `UploadResult` |
| POST | `/api/stores/:id/analyze` | B | — | `AnalysisResult` |
| POST | `/api/ai/report` | B | `{ storeId }` | `SellerReport` |
| POST | `/api/ai/risk` | B | `{ listingId }` | `BuyerRiskReport` (viewer 필터 통과 데이터만 입력) |
| POST | `/api/listings` | B | `{ storeId, 가격 필드, premiumBreakdown?, premiumBreakdownLevel }` | `{ listingId }` |
| GET | `/api/listings`, `/api/listings/:id` | B | — | 기존과 동일 |
| POST | `/api/deals` | B | `{ listingId }` | `{ dealId }` + 업무 자동 생성 |
| GET | `/api/deals/:id/tasks` | B | — | `DealTasksResponse` |
| PATCH | `/api/tasks/:id` | B | `{ status }` | `{ ok }` |

- `answer.value` 가 슬롯 스키마에 안 맞으면 `400` + 한국어 오류 문구, 질문은 그대로 유지.
- `progress` = 채워진 필수 슬롯 ÷ 전체 필수 슬롯. **코드가 계산**.
- `ask_upload` = `'none' | RecordKind`. A의 페이지가 이 값을 `<UploadPanel highlight>` 로 넘긴다.
- `InputSpec` 은 A의 `src/lib/interview/types.ts` 에 둔다(공용 `types.ts` 아님):
  ```ts
  type InputSpec =
    | { type: 'number'; unit: string; min?: number; max?: number }
    | { type: 'money' }                                  // 화면 단위 만원, 저장은 원
    | { type: 'month' }
    | { type: 'choice' | 'multi'; options: string[] }
    | { type: 'boolean'; allowUnknown?: boolean }
    | { type: 'percent_split'; parts: string[] }
    | { type: 'table'; columns: { key: string; label: string; input: InputSpec }[] }
    | { type: 'file'; kind: 'equipment' | RecordKind }
    | { type: 'name'; maxLength: 30 };                   // 고유명사 칸
  ```

---

## 6. PR-0: 계약 고정 (병렬 개발 시작 전, 순서대로)

| 순서 | PR | 담당 | 포함 내용 | 완료 기준 |
| --- | --- | --- | --- | --- |
| 0 | `sihu` → `main` | F | 플랫폼 프론트 전체 (layout·globals·page·common·listings·사진) | `main` 에서 `npm run build` 통과. **A·B는 이 머지 뒤에 브랜치를 딴다** |
| 1 | PR-0B | B | `types.ts` FACT_KEYS 확장(§7), `src/lib/report/types.ts`, `src/lib/supabase.ts`, `getUploadedKinds` 스텁, `UploadPanel` 껍데기, `/api/ai/report`·`/api/ai/risk` 목업 라우트 + `mocks/seller-report.json`·`risk-report.json`, `mocks/store-facts.json` 새 키 반영, 필요한 shadcn 컴포넌트 일괄 추가(A가 요청: 입력 도구에 필요한 것) | 빌드 통과, F가 리스크 보고서 페이지를 목업으로 만들 수 있음 |
| 2 | PR-0A | A | `llm.ts`(래블업 호출 1회 성공 확인), `.env.example` LLM 변수, `interview/types.ts`(`InputSpec`), `facts/repo.ts`, facts·stores 라우트 이관, `/api/ai/interview` 목업(fixture 1턴), `seller/layout.tsx` | 빌드 통과, B가 `chatJson` 으로 보고서 프롬프트를 시험할 수 있음 |
| 3 | 문서 PR | (지정 1인) | 다른 문서(PRD·ARCHITECTURE·AI_PROMPTS·SKILL·CLAUDE)를 이 플랜에 맞게 수정 | — |

PR-0 이후 `types.ts` 변경이 필요하면: 채널 공지 → B가 반영 → 즉시 머지 → 전원 `main` pull.

---

## 7. PR-0B에서 바꿀 공용 타입 (A 요청분)

`FACT_KEYS` 추가:

| 키 | 값 타입 | 쓰는 곳 |
| --- | --- | --- |
| `store_name` | string(30자) | 판매 페이지 매장명 |
| `is_anonymous` | boolean | 익명 공개 여부 |
| `premium_ask` | number(원) | 희망 권리금 → 시뮬레이터·게시 폼 기본값 |
| `deposit`, `monthly_rent`, `maintenance_fee` | number(원) | 임대차 조건, 고정비 대조 |
| `est_initial_cost` | number(원) | 예상 초기 인수 비용 |
| `owner_tasks` | string[] (선택지) | 점주 전담 업무 → 운영 의존도 점수 |
| `training_items` | string[] (선택지) | 노하우: 교육 체크리스트 |
| `knowhow_artifacts` | `KnowhowArtifacts` | 노하우 산출물 → 매물 "운영 매뉴얼", 인수인계 업무 |

값 모양 고정(B가 그대로 읽음):
- `sale_reason`, `industry`: 정해진 선택지 문자열 중 하나
- `open_days`: `('월'|'화'|'수'|'목'|'금'|'토'|'일')[]`, `open_hours`: `{ open: 'HH:mm'; close: 'HH:mm' }`
- `channel_mix`: `{ hall: number; takeout: number; delivery: number }` (합 100)
- `customer_segments`, `inventory_included`: `string[]`
- `renewal_needed`: `boolean | null`(모름), `franchise_terms`: `{ type: 'independent'|'franchise'; monthlyRoyalty?: number }`
- `Supplier` 에 `orderCycle?: string` 추가, `KnowhowArtifacts` 인터페이스 추가
- 주석 수정: `Anomaly.aiExplanation` 의 "Gemini" → "LLM"

`intro`(매장 소개)는 facts로 받지 않는다. 자연어라서 B의 보고서 `headline`·`summary` 로 만들고 게시 폼에서 점주가 확인한다.

---

## 8. 역할별 작업 목록

### A. 정보 수집

| ID | 우선 | 작업 | 산출 파일 | 완료 기준 |
| --- | --- | --- | --- | --- |
| A-0 | P0 | 래블업 클라이언트 | `src/lib/ai/llm.ts` | JSON 응답 → zod 통과, 실패 시 재시도·폴백, `DEMO_MODE` fixture 반환 |
| A-1 | P0 | 슬롯 정의 | `src/lib/interview/slots.ts` | §1 표의 모든 슬롯: 입력 방식, zod, 기본 질문, 기본 선택지, 기본 순서 |
| A-2 | P0 | 질문 엔진 | `src/lib/interview/{next,prompts,schemas,progress}.ts`, `api/ai/interview/route.ts` | 한 턴: 답 검증 → 저장(🔵) → 다음 질문 1개 + 입력 도구. LLM 실패 시 기본 순서로 진행 |
| A-3 | P0 | 입력 도구 9종 | `components/interview/inputs/**` | 숫자·금액(만원↔원)·월·선택·다중·예/아니오·비율·표·파일, 잘못된 값은 칸 아래 오류 |
| A-4 | P0 | 진단 화면 | `seller/diagnose/**`, `QuestionBubble`, `FactsPanel` | 질문·입력 좌 / 채워진 정보 패널 우(같은 입력 도구로 수정 → PATCH), 재무 자료 차례에 `UploadPanel`, 완료 시 "보고서 만들기" → `/seller/report` |
| A-5 | P0 | 장비 CSV | `facts/importEquipmentCsv.ts`, `api/stores/[id]/facts/import`, `public/templates/equipment.csv` | 데모 장비 6행 업로드 → 패널에 표로 표시. 템플릿 내려받기 링크 |
| A-6 | P0 | 저장소 | `src/lib/facts/repo.ts` | 새로고침해도 facts 유지 (저장 방식은 결정 로그) |
| A-7 | P0 | 데모 fixture | `src/lib/interview/fixtures/*.json` | `DEMO_MODE=true` 로 진단 시연 가능 |
| A-8 | P2 | 노하우 | `seller/knowhow/**`, 노하우 슬롯·프롬프트 | 역할별 직무·교육 항목을 LLM 보기에서 체크 → 산출물 미리보기·수정 → `knowhow_artifacts` 저장 |

### B. 분석·보고서

| ID | 우선 | 작업 | 산출 파일 | 완료 기준 |
| --- | --- | --- | --- | --- |
| B-1 | P0 | 재무 CSV 파싱·정규화·중복 제거 | `analysis/{parse,dedupe,repo}.ts`, `api/stores/[id]/upload` | 샘플 6종 업로드 → "중복 제거됨 6건" |
| B-2 | P0 | 지표·출처·이상치·점수·가치·회수기간 | `analysis/{provenance,metrics,anomalies,scores,valuation,payback}.ts` | SKILL.md §2 공식 그대로, 데모 기대 이슈 4개가 모두 잡힘 |
| B-3 | P0 | 분석 API + 이상치 설명 | `api/stores/[id]/analyze`, `report/prompts/anomaly.ts` | `AnalysisResult` 실값, 8월 `cash_ratio` 에 AI 설명 |
| B-4 | P0 | 매각 보고서 생성 | `report/{prompts,schemas}/seller.ts`, `api/ai/report` | `SellerReport` zod 통과, 숫자는 입력값만 인용, `headline`·`summary` 가 매장 소개 역할 |
| B-5 | P0 | 보고서 화면 | `seller/report/**`, `components/report/**` | 월별 차트(8월 주황 점), 점수 3종, 가치 범위 + `AiEstimateNotice`, 시뮬레이터(권리금 변경 → 회수기간 즉시 변경, 클라이언트 계산) |
| B-6 | P0 | 매물 게시 | `PublishForm`, `listing/{build,repo}.ts`, `api/listings` | facts 기본값으로 채운 폼 → 게시 → `/listings/:id` 에서 열림. F에게 `getListing`·`listListings` 전달 |
| B-7 | P1 | 구매자 리스크 보고서 | `report/{prompts,schemas}/risk.ts`, `api/ai/risk` | viewer 필터 통과 데이터만 입력, 잠긴 정보는 "구독 후 확인 가능" |
| B-8 | P1 | 거래 성사 → 인수인계 | `DealButton`, `handover/{generate,enrich}.ts`, `api/deals`, `api/tasks` | 버튼 → deal 생성 → 장비 5·거래처 3·계정 5·직원 3·지위승계·임대인 협의 업무 생성 → `/handover/:dealId` |
| B-9 | P2 | PDF 인쇄·결제 모달 목업 | `components/report/{PrintLayout,PaywallDialog}.tsx` | `window.print()` 레이아웃 + 결제 모달 |

> **업무량 주의:** B가 A보다 많다. A가 A-7까지 끝나면 **B-7(리스크 보고서 LLM)** 또는 **B-8의 `enrich.ts`** 를 A에게 넘긴다. 넘길 때는 해당 파일의 소유권을 채널에서 명시적으로 옮긴다.

### F. 플랫폼 프론트 (참고)

진행 중인 `/handover/[dealId]`, `/listings/[id]/risk` 화면. B의 `getListing`·`listListings` 가 오면 `listing-source.ts` 교체, `routes.ts` 에 `sellReport`·`knowhow` 추가.

---

## 9. 타임라인 (T = PR-0 시작 시각)

| 시간 | A | B | 전원 |
| --- | --- | --- | --- |
| T+0:00–0:45 | PR-0A (llm.ts 실호출 확인 먼저) | PR-0B | F: `sihu` → `main` 머지가 T+0 전에 끝나야 함 |
| T+0:45–3:00 | A-1~A-4 (슬롯 → 엔진 → 입력 도구 → 화면) | B-1~B-3 (업로드 → 분석) | 1시간마다 `main` 머지 |
| T+3:00 🔔 | 체크포인트 15분: 진단 → 업로드 → 분석 결과가 한 번 이어지나? 아니면 P1 보류 | | |
| T+3:00–5:00 | A-5~A-7, (여유 시 B-7/B-8 이관분) | B-4~B-6 → B-7, B-8 | |
| T+5:00–6:00 | 통합 E2E (DEMO_SCRIPT 순서), 버그 수정, fixture 녹화 | 통합 E2E, 시드 데이터, 배포 | |
| T+6:00–6:30 | `DEMO_MODE` 검증 | 배포 환경변수 확인 | **코드 프리즈**, 리허설 2회(1회는 `DEMO_MODE=true`) |

제출 마감: 11/1 08:30 (GitHub, 배포 URL, 영상, 슬라이드).

---

## 10. Git 규칙

- 브랜치: `main` 에서 따서 `feat/A-<기능>`, `feat/B-<기능>`. `main` 직접 커밋 금지, force push 금지.
- 머지 전: `main` 을 내 브랜치로 merge → `npx tsc --noEmit` → `npm run build` 통과 → PR.
- 작게 자주: 최소 1시간에 1번 `main` 머지. 머지 후 채널에 "머지함: 무엇" 한 줄.
- 커밋 메시지: `[A] 금액 입력 도구`, `[B] 이상치 탐지` 처럼 역할 접두사.
- **충돌 위험 파일과 규칙**

| 파일 | 규칙 |
| --- | --- |
| `src/lib/types.ts` | B만. PR-0 후에는 공지 → B 반영 → 즉시 머지 |
| `package.json`, lockfile | B만 `npm i`. 래블업 호출은 `fetch` 로 해서 새 패키지 없이 간다 |
| `src/lib/mocks/index.ts` | B만. A는 import 만 |
| `.env.example` | A가 PR-0에서만. 이후 추가는 공지 |
| `src/app/seller/layout.tsx` | A만. B는 보고서 페이지 안에서만 작업 |
| `src/components/common/routes.ts`, `SiteHeader.tsx` | F만. 주소 추가는 F에게 요청 |
| `docs/AI_PROMPTS.md` | 섹션 단위로만 수정 (A: 공통·1·2 / B: 3~6) |
| `src/app/api/ai/**` | 폴더 단위: `interview/` = A, `report/`·`risk/` = B |
| `src/app/api/stores/[id]/**` | `facts/` = A, `upload/`·`analyze/` = B |

## 11. Claude Code 사용 규칙

- 모든 팀원은 프로젝트 루트에서 Claude Code를 연다 → `CLAUDE.md` 와 `.claude/skills/exitos/SKILL.md` 가 자동으로 적용된다.
- 작업 시작 시 "내 역할은 A(정보 수집). 소유 경로 밖은 수정하지 마"처럼 **역할과 소유 경로를 먼저 말한다**.
- 공용 계약(타입·API·§4 함수 시그니처) 변경 제안이 나오면 바로 적용하지 않고 채널에 공지한다.
- 래블업 API 키는 서버 코드에서만 읽는다(`NEXT_PUBLIC_` 금지). 프롬프트·로그에 키를 출력하지 않는다.

## 12. 결정 로그

결정이 생기면 여기 한 줄씩 추가 (누가·언제·무엇).

- 2026-10-31 · 전원 · 인증 대신 `demo_role` 쿠키로 시연 (F: 역할 전환 토글 UI는 제거, 구독·승인 버튼으로 전환)
- 2026-10-31 · 전원 · CSV만 지원, 재무 고정 템플릿 6종 + 장비 템플릿 1종
- 2026-10-31 · 전원 · 역할 재편: A(정보 수집) / B(분석·보고서) / F(플랫폼 프론트, 기존 A). 이전 C 작업은 B가 인수
- 2026-10-31 · 전원 · LLM: Gemini → 래블업 API, `src/lib/ai/llm.ts` 단일 클라이언트
- 2026-10-31 · 전원 · 정보 수집은 자연어 답변 없이 숫자·선택·파일 입력만. LLM은 질문 순서·문구·선택지만 담당, 값 검증은 코드
- (미정) 저장소: Supabase vs 서버 메모리 — Vercel 배포 시 메모리 저장은 요청 간 유지가 안 됨
