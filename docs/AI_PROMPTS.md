# ExitOS LLM 프롬프트 명세 (래블업 API)

섹션별 담당: **공통·§1·§2 = A(정보 수집)**, **§3~§6 = B(분석·보고서)**. 자기 섹션만 수정한다.
코드 위치: A → `src/lib/ai/llm.ts`, `src/lib/interview/{prompts,schemas}.ts` / B → `src/lib/report/{prompts,schemas}/*.ts`, `src/lib/handover/enrich.ts`.
공통 원칙은 [SKILL.md](../.claude/skills/exitos/SKILL.md) §3.

## 프롬프트 작성 방식 (전원 공통)

1. **작업별 시스템 프롬프트를 코드 파일에 미리 적어 둔다.** 실행 중에 지시문을 조립하지 않는다.
   - A: `src/lib/interview/prompts.ts` (`DIAGNOSIS_SYSTEM_PROMPT`, `KNOWHOW_OPTIONS_SYSTEM_PROMPT`, `KNOWHOW_ARTIFACTS_SYSTEM_PROMPT`)
   - B: `src/lib/report/prompts/*.ts` 에 같은 방식으로 둔다.
2. **지시·규칙은 시스템 프롬프트에만, user 메시지에는 이번 호출의 데이터 JSON만** 넣는다.
3. 시스템 프롬프트는 `## 역할` / `## 입력` / `## 할 일` / `## 출력 형식` / `## 하지 않는 것` 순서로 쓴다.
4. 공통 머리말은 다시 쓰지 않는다. `chatJson()` 이 자동으로 앞에 붙인다.
5. "출력 형식"과 zod 스키마(A: `src/lib/interview/schemas.ts`)를 같게 유지한다.
6. **프롬프트 원문의 기준은 코드 파일이다.** 이 문서에는 입력·출력 구조와 규칙의 이유를 적는다. 프롬프트를 고치면 이 문서의 해당 섹션도 맞춘다.

## 공통 호출 래퍼 `chatJson()` (A, `src/lib/ai/llm.ts`)

래블업 API 실호출로 확인한 내용 (2026-10-31):
- OpenAI 호환 `POST https://api.console.lablup.ai/v1/chat/completions`, `Authorization: Bearer <키>`. 모델 `DeepSeek-V4.1-Flash-B300` (현재 키 티어에서 사용 가능한 유일한 모델).
- `response_format: { type: 'json_object' }` 를 받아들이고 JSON으로 답한다.
- 모델이 답하기 전에 추론(`reasoning_content`)을 만든다. 추론도 `max_tokens` 를 쓰므로 너무 작으면 답(`content`)이 비어 온다.
- `chat_template_kwargs` 로 추론을 끄면 더 빠르다(약 0.15~0.3초). 켜면 수 초 걸린다.

`chatJson()` 동작:
- 시스템 메시지 = `COMMON_SYSTEM_PROMPT` + 빈 줄 + 호출부가 넘긴 작업별 시스템 프롬프트
- `thinking` 기본 `false`(질문 엔진용). 보고서처럼 긴 서술은 `thinking: true` (기본 `maxTokens` 4,000, 제한 시간 60초)
- 응답 JSON → zod 검증 → 실패 시 1회 재시도 → 그래도 실패하면 `LlmError('AI_SCHEMA_FAIL')`. 키 오류(401·403)는 재시도하지 않는다. 설정이 비면 `LlmError('AI_CONFIG_MISSING')`
- `DEMO_MODE=true` 이고 `fixture` 를 넘기면 호출 없이 그대로 돌려준다.

```ts
const next = await chatJson({
  system: DIAGNOSIS_SYSTEM_PROMPT,                  // 미리 작성한 시스템 프롬프트
  user: buildDiagnosisUserMessage({ known, missing_slots, uploaded, turn }),  // 데이터만
  schema: DiagnosisNextSchema,
  fixture: demoFixture,                             // DEMO_MODE 용
});
```

공통 머리말 `COMMON_SYSTEM_PROMPT` (모든 호출 앞에 자동으로 붙음):
```
너는 소상공인 매장 양도를 돕는 ExitOS의 AI 분석가다.
- 한국어 존댓말, 짧고 구체적으로.
- 반드시 JSON 객체 하나만 출력한다. 설명 문장이나 코드 블록 표시를 붙이지 않는다.
- 제공된 숫자를 절대 바꾸거나 새로 계산하지 않는다. 숫자가 필요하면 입력에 있는 값만 인용한다.
- 법률·세무 판단을 단정하지 않는다. "확인이 필요합니다", "전문가 확인을 권장합니다"로 표현한다.
- 입력에 없는 사실을 지어내지 않는다. 모르면 "자료 없음"이라고 쓴다.
```

---

## 1. 진단 질문 (`interview.diagnosis`) — A

점주는 숫자·선택·파일로만 답한다. **LLM은 점주의 답을 읽거나 값을 추출하지 않는다.** 답 검증·저장은 코드(`slots.ts` 의 zod)가 한다.
LLM이 하는 일: 다음에 물을 슬롯 고르기, 질문 문장, 업종에 따라 달라지는 선택지.

- 시스템 프롬프트: `DIAGNOSIS_SYSTEM_PROMPT` (`src/lib/interview/prompts.ts`) — 아래 "지시"가 들어 있다.
- user 메시지: `buildDiagnosisUserMessage()` 가 만든 데이터 JSON만.
- 응답 스키마: `DiagnosisNextSchema` (`src/lib/interview/schemas.ts`)

**입력(user 메시지, 데이터만):**
```json
{
  "known": { "industry": "카페", "region": "서울 마포구 망원동", "opened_at": "2022-09" },
  "missing_slots": [
    { "slot": "sale_reason", "label": "매각 사유", "input": "choice" },
    { "slot": "deposit", "label": "임대보증금", "input": "money" },
    { "slot": "owner_tasks", "label": "점주 전담 업무", "input": "multi", "needs_options": true }
  ],
  "uploaded": ["pos", "delivery"],
  "turn": 4
}
```

**지시 (시스템 프롬프트 "할 일" 요약, 원문은 `prompts.ts`):**
1. `next_slot`: missing_slots 의 slot 중 하나만. 우선순위: 업종·지역 → 운영기간 → 매각 사유·희망 시기 → 희망 권리금·임대 조건 → 점주 근무시간 → 직원 구성 → 장비 → 거래처·디지털 계정
2. `question`: 존댓말 40자 내외 한 문장. money 면 "만원 단위", number 면 단위를 드러낸다. known 에 있는 내용은 다시 묻지 않는다.
3. `options`: `needs_options` 가 true 일 때만 업종에 맞는 보기 4~8개(각 15자 이내). 아니면 `[]`.
4. `ask_upload`: turn 3 이상이고 pos → card_settlement → delivery → purchases 중 빠진 게 있으면 가장 앞의 것. 아니면 `"none"`.
5. 하지 않는 것: 금액 계산·추정, 직원 실명·연락처·주민번호·계좌 질문, 법률·세무 판단.

**실호출 확인 (2026-10-31):** 카페·4턴·POS만 업로드 → `deposit` + "임대보증금은 얼마인가요? 만원 단위로 알려주세요." + `ask_upload: card_settlement`. 보기 필요 슬롯 → 카페용 보기 8개.

**응답 스키마 (zod로 검증):**
```json
{
  "next_slot": "string (missing_slots 의 slot 중 하나)",
  "question": "string",
  "options": ["string"],
  "ask_upload": "none | pos | card_settlement | delivery | purchases | fixed | payroll"
}
```

**코드가 하는 일 (LLM 아님):** `next_slot` 이 missing_slots 에 없으면 무시하고 기본 순서 사용 · 입력 도구 종류(`InputSpec`)는 `slots.ts` 에서 결정 · `done`·`progress` 계산 · LLM 실패 시 `slots.ts` 의 기본 질문·기본 선택지로 진행.

## 2. 노하우 질문 (`interview.knowhow`) — A, P2

같은 엔진. 슬롯: `staff_roles[].duties`(역할별 직무, multi), `owner_tasks`(multi), `training_items`(multi), `suppliers[].orderCycle`(choice).

LLM이 하는 일 (작업마다 시스템 프롬프트를 따로 둔다, `src/lib/interview/prompts.ts`):
1. **보기 생성** — `KNOWHOW_OPTIONS_SYSTEM_PROMPT`, 스키마 `KnowhowOptionsSchema` (`{ options: string[] }`)
   - user 데이터: `{ industry, target: 'role_duties' | 'owner_tasks' | 'training_items', role?, already[] }`
   - 업종·역할별 직무, 교육 항목 보기 4~8개 (점주는 체크만 한다). 이미 고른 항목은 다시 내지 않는다.
2. **산출물 문장** — `KNOWHOW_ARTIFACTS_SYSTEM_PROMPT`, 스키마 `KnowhowArtifactsSchema`
   - user 데이터: `{ industry, staff_roles, owner_tasks, owner_weekly_hours, training_items, suppliers }`
   - 점주가 고른 항목만으로 `artifacts_preview` 를 만든다. 고르지 않은 항목을 추가하지 않는다.

**산출물 스키마:**
```json
{
  "roleManual": [{ "role": "string", "duties": ["string"] }],
  "trainingChecklist": ["string"],
  "ownerBurdenSummary": "string (2문장)",
  "supplierHandover": [{ "name": "string", "item": "string", "orderCycle": "string" }]
}
```
점주가 우측 패널에서 확인·수정한 뒤 `knowhow_artifacts` 로 저장한다.

---

## 3. 이상치 설명 (`anomaly.explain`) — B

**입력:** 코드가 탐지한 `Anomaly[]` + 해당 월 주변 3개월 수치.
**지시:** 각 이상치에 대해 1~2문장으로 (a) 왜 확인이 필요한지 (b) 판매자가 제출하면 해소되는 증빙을 제시. 가공 매출이라고 단정 금지.
**예시 출력:** "2026-08 현금 매출이 평소의 약 8배입니다. 카드사 정산과 대조할 수 없어 확인이 필요합니다. 현금영수증 발행 내역이나 통장 입금 내역을 올려주시면 증빙으로 전환됩니다."
**스키마:** `{ "items": [{ "index": number, "explanation": string, "evidence_to_submit": string }] }`

## 4. 매각 보고서 (`report.seller`) — B

**입력:** `AnalysisResult`(숫자 확정본) + `store_facts`.
**출력 스키마:**
```json
{
  "headline": "string (30자 이내 한 줄 매력 포인트)",
  "summary": "string (3문장)",
  "sections": {
    "pnl": "string", "assets": "string", "operations": "string",
    "contracts": "string", "risks": ["string"], "strengths": ["string"]
  },
  "seller_todo": ["string (매각 전 보완하면 가치가 오르는 행동)"]
}
```
지시 요점: 강점은 증빙(🟢) 수치 위주로 인용, 위험은 🟠 항목과 운영 의존도에서 도출, `seller_todo` 는 "확인 필요"를 "증빙 확인"으로 바꾸는 행동 중심. `headline`·`summary` 는 판매 페이지 매장 소개로도 쓰인다(게시 폼에서 점주 확인).

## 5. 구매자 리스크 보고서 (`report.buyer_risk`) — B, P1

**입력:** `filterListingForViewer()` 를 통과한 매물 데이터 **만** (구독자가 아닌데 재무가 들어가면 안 됨) + 희망 권리금.
**출력 스키마:**
```json
{
  "overall": { "level": "low|medium|high", "one_liner": "string" },
  "risks": [{ "title": "string", "level": "low|medium|high", "why": "string", "question_to_seller": "string" }],
  "value_opinion": "string (코드가 계산한 Valuation 범위를 인용, 희망가가 범위 내/외인지)",
  "due_diligence_checklist": ["string"]
}
```
지시 요점: `question_to_seller` 는 실사 때 그대로 물어볼 수 있는 문장. 잠긴 정보는 "구독 후 확인 가능"으로 표기.

## 6. 인수인계 업무 보강 (`handover.enrich`) — B, P1

**입력:** `generate.ts` 가 만든 `HandoverTask[]` (title, category, stage) + 업종.
**출력:** 각 task에 `description`(1문장) + `checklist`(2~4개). 새 task 추가 금지, 순서·stage 변경 금지.

---

## Fixture (DEMO_MODE)

`DEMO_MODE=true` 이면 `chatJson()` 이 호출부가 넘긴 `fixture` 를 그대로 돌려준다. 파일은 각 담당 폴더에 둔다.
- A: `src/lib/interview/fixtures/` — `diagnosis_turn_{1..N}.json`, `knowhow_*.json`
- B: `src/lib/report/fixtures/` — `anomaly.json`, `report_seller.json`, `risk.json`, `handover_enrich.json`

리허설 때 실제 응답을 한 번 받아 저장해 두면 발표 중 네트워크·쿼터 문제를 피할 수 있다.
