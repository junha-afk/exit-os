---
name: exitos
description: ExitOS(소상공인 매각 준비·인수인계 SaaS) 도메인 규칙과 구현 컨벤션. ExitOS 코드에서 화면·API·DB·LLM 프롬프트를 만들거나 고칠 때, 권리금·매출·출처 라벨·공개 범위·인수인계 업무를 다룰 때 반드시 먼저 읽는다.
---

# ExitOS 개발 스킬

팀원(A 정보 수집 · B 분석·보고서 · F 플랫폼 프론트)이 각자 Claude Code로 작업해도 **같은 규칙으로 코드를 만들기 위한** 공통 컨텍스트다.
제품 요구사항은 `PRD.md`, 구조·계약은 `docs/ARCHITECTURE.md`, 프롬프트는 `docs/AI_PROMPTS.md`.

## 0. 작업 시작 전 체크

1. 내가 수정하려는 파일이 **내 담당 폴더**인가? (`docs/TEAM_PLAN.md` §2 소유권 표) 아니면 담당자에게 요청하거나 새 파일을 만든다.
2. 공용 타입(`src/lib/types.ts`)·공개 범위 맵(`src/lib/visibility.ts`)을 바꿔야 하면 **팀 채널에 먼저 공지**.
3. 7시간 해커톤이다. 데모 시나리오(`docs/DEMO_SCRIPT.md`)에 안 나오는 기능은 만들지 않는다.

## 1. 절대 규칙 (어기면 데모가 거짓말이 된다)

### 1-1. 모든 수치에는 출처 라벨
```ts
type Provenance = 'verified' | 'user_input' | 'needs_check';
// UI 라벨: 🟢 증빙 확인 / 🔵 사용자 입력 / 🟠 확인 필요
```
- 숫자를 화면에 그릴 때는 `<Metric value provenance />` 컴포넌트만 사용. 라벨 없는 숫자 금지.
- `verified` 는 **두 개 이상 독립 출처가 ±3% 이내 일치**할 때만. LLM이 `verified` 를 부여하는 것 금지 — 코드(`src/lib/analysis/provenance.ts`)만 판정.
- 집계값의 출처 = 구성 요소 중 **가장 낮은 신뢰도** (needs_check < user_input < verified).

### 1-2. 공개 범위는 서버에서 자른다
```ts
type AccessLevel = 'public' | 'approved' | 'subscriber';
type Viewer = 'seller' | 'buyer' | 'buyer_subscribed' | 'buyer_approved';
```
- 필드 → 레벨 매핑은 `src/lib/visibility.ts` 의 `VISIBILITY` 한 곳에만 정의 (PRD §4-E 표가 원본).
- API에서 `filterListingForViewer(listing, viewer)` 를 거친 데이터만 응답. 잠긴 필드는 값 대신 `{ locked: true, level }` 로 내려 UI가 블러 처리.
- 권리금 구성(`premium_breakdown`)만 판매자가 `public`/`approved` 선택 가능. `buyer_subscribed` 는 approved 항목을 못 본다(구독 ≠ 승인), `buyer_approved` 는 둘 다 본다.
- 판매자 본인은 전부 본다.

### 1-3. 돈 계산은 코드, 말은 LLM
- 매출·이익·이익률·회수기간·가치 범위 = `src/lib/analysis/*` 의 순수 함수. 단위 테스트 1개씩만이라도.
- LLM은 **질문 순서·문구·업종별 선택지, 이상치 사유 서술, 보고서 문장, 리스크 서술, 인수인계 업무 문구**만 담당.
- 점주의 답은 숫자·선택·파일로만 받고 코드(zod)가 검증한다. LLM이 점주 답변을 읽고 값을 추출하지 않는다.
- LLM에 숫자를 넘길 땐 이미 계산된 값을 주고 "이 숫자를 바꾸지 말 것"을 명시.

### 1-4. 추정은 추정이라고 말한다
가치 추정·리스크 보고서·회수 시나리오가 보이는 모든 화면/PDF에 `<AiEstimateNotice />`:
> 본 수치는 제공된 자료를 바탕으로 한 AI 추정치이며, 감정평가·법률·세무 자문을 대체하지 않습니다.
- 법률 판단 표현 금지("불법입니다", "계약 무효") → "확인이 필요한 항목", "전문가 확인 권장".

## 2. 도메인 계산 규칙 (`src/lib/analysis`)

| 지표 | 공식 |
| --- | --- |
| 월매출 | POS(카드+현금) + 배달 총매출 − 중복(배달 중 POS 포함분) |
| 월 영업이익 | 월매출 − 원재료비 − 인건비 − 임대료·관리비 − 공과금 − 배달수수료 − 카드수수료(매출 1.5% 가정) |
| 이익률 | 월 영업이익 ÷ 월매출 |
| 조정 영업이익 | 월 영업이익 − 점주 주당 근무시간 × 4.345 × 12,000원(점주 대체 시급, 설정값) |
| 회수 기간(개월) | (희망 권리금 + 예상 초기 비용) ÷ 월 영업이익 — 보증금은 별도 표기("회수 가능") |
| 시나리오 | 보수 = 최근 12개월 월이익 하위 25% 값 / 기준 = 중앙값 / 낙관 = 상위 25% |
| 권리금 추정 범위 | 영업권리금 = 조정 영업이익 × 12 ~ × 24 / 시설권리금 = 장비 잔존가치 합(정액법, 내용연수 5년) / 합산해 하한~상한 |

**AI 점수 (0~100, 코드 계산 + LLM은 설명만)**
- 매출 안정성: `100 − 변동계수(CV)×200` 를 0~100 클램프
- 자료 완성도: (12개월 × 재무 자료 6종(`RECORD_KINDS`) 중 존재하는 셀 비율) × 0.7 + verified 비율 × 0.3
- 운영 의존도(높을수록 위험): 점주 주 근무시간/60 × 60 + 점주 전담 업무 비율 × 40

**이상치 규칙 (`needs_check` 부여)**
- 월매출이 12개월 평균 대비 ±40% 초과 또는 ±2σ 초과
- 현금 매출 비중이 평소 대비 3배 이상 (← 판례의 가공 매출 패턴, 데모 핵심)
- POS 카드매출 ↔ 카드사 정산 불일치 3% 초과
- 원재료 매입 대비 매출 비율이 평균 대비 ±30% 초과
- 필수 자료의 월 누락

**중복 제거**
- `dedupe_key = sha1(source_group | month | channel | amount)` — 같은 키는 1건만.
- 배달 정산 행의 `included_in_pos = 'Y'` 인 달은 배달 매출을 월매출 합산에서 빼고 "중복 제거됨"으로 기록.

## 3. LLM(래블업 API) 사용 규칙

- 호출은 `src/lib/ai/llm.ts` 의 `chatJson()` 하나로만 한다(서버 전용, `fetch` 사용, 새 패키지 없음). 주소·키·모델은 `LABLUP_API_BASE_URL`, `LABLUP_API_KEY`, `LABLUP_MODEL`. 클라이언트에서 직접 호출 금지.
- 항상 JSON으로 받는다 → `zod` 로 검증 → 실패 시 1회 재시도 → 그래도 실패하면 폴백(인터뷰는 기본 질문, 보고서는 폴백 문구).
- 프롬프트 원문은 `docs/AI_PROMPTS.md` 와 코드(`src/lib/interview/prompts.ts`, `src/lib/report/prompts/*.ts`)를 동기화. 프롬프트 수정은 해당 섹션 담당자만(공통·§1·§2 = A, §3~§6 = B).
- **질문 엔진 패턴 (진단·노하우 공용, 담당 A):**
  1. 입력: 지금까지의 facts + 남은 필수 슬롯 목록 + 업로드된 재무 자료 종류
  2. 출력: `{ next_slot, question, options? }` — 다음에 물을 슬롯 1개, 질문 문장, 업종별 선택지
  3. 화면은 슬롯의 입력 도구(숫자·금액·월·선택·다중 선택·예/아니오·비율·표·파일)를 띄운다. 자유 입력 채팅창은 없다.
  4. 서버는 답 `{ slot, value }` 를 슬롯별 zod(`src/lib/interview/slots.ts`)로 검증 → `user_input` 라벨로 저장 → 우측 패널 갱신 → 점주가 패널에서 같은 입력 도구로 수정 가능
  5. 한 번에 질문 1개, 존댓말, 40자 내외. LLM이 실패하면 `slots.ts` 의 기본 순서·문구·선택지로 진행
- 데모 안정성: `DEMO_MODE=true` 이면 녹화된 응답(`src/lib/interview/fixtures/`, `src/lib/report/fixtures/`)을 사용한다(네트워크 장애 대비).

## 4. UI 컨벤션

- Tailwind + shadcn/ui. 한국어 UI, 금액은 `formatKRW()` → "1억 2,000만 원", "860만 원". 소수점 이익률은 1자리.
- 색: 🟢 `emerald`, 🔵 `sky`, 🟠 `amber`. 잠금 섹션: `blur-sm` + 자물쇠 + CTA.
- 차트는 Recharts. 월별 추이 라인차트에서 `needs_check` 월은 주황 점 + 툴팁 사유.
- 판매자 화면은 "해야 할 일 중심", 구매자 화면은 "리스크 중심".
- 역할 전환 토글 UI는 없다. 구독(내 정보 메뉴)·열람 승인 요청(매물 상세) 버튼이 `useMembership()` 으로 쿠키 `demo_role` 을 바꾸고 서버가 읽는다.
- 화면 디자인(폰트·색·모서리·레이아웃)은 루트 `DESIGN.md` 를 따른다.

## 5. 인수인계 업무 생성 규칙

12단계: `prep`, `valuation`, `buyer_search`, `due_diligence`, `landlord`, `premium_contract`, `lease_contract`, `license_transfer`, `tax_registration`, `staff_contracts`, `handover_settlement`, `post_tax`.

- 데이터 → 업무 매핑은 결정론 규칙(`src/lib/handover/generate.ts`)이 먼저, LLM은 업무 설명 문장과 체크리스트 세부 항목만 보강.
  - 장비 1개 → "장비 인계: {이름} 작동 확인·매뉴얼 전달" (stage `handover_settlement`, owner `both`)
  - 거래처 1개 → "거래처 명의 변경: {거래처}" (`staff_contracts`, owner `seller`)
  - 디지털 계정 1개 → "계정 이전: {배달앱/POS/SNS}" (`handover_settlement`, owner `seller`)
  - 직원 역할 1개 → "고용 승계 협의: {역할}" (`staff_contracts`, owner `both`)
  - 업종이 음식점/카페 → "영업신고 지위승계 신고" (`license_transfer`, owner `buyer`)
  - 임대차 만료 12개월 이내 → "임대인 갱신 협의" (`landlord`, owner `seller`, priority high)
- 진행률 = done ÷ 전체(가중치 동일). "지금 할 일" = `depends_on` 이 모두 done 이고 status ≠ done.

## 6. 작업 마무리 체크리스트

- [ ] 새 숫자에 출처 라벨이 붙었나?
- [ ] 새 매물 필드를 `VISIBILITY` 에 등록했나? (등록 안 된 필드는 기본 `subscriber`)
- [ ] AI 추정 화면에 고지 문구가 있나?
- [ ] LLM 응답을 zod 로 검증하나? 실패 폴백이 있나?
- [ ] 담당 폴더 밖 파일을 건드렸다면 공지했나?
- [ ] `npm run build` 통과?
