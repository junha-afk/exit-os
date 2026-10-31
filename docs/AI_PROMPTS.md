# ExitOS LLM 프롬프트 명세 (래블업 API)

섹션별 담당: **공통·§1·§2 = A(정보 수집)**, **§3~§6 = B(분석·보고서)**. 자기 섹션만 수정한다.
코드 위치: A → `src/lib/ai/llm.ts`, `src/lib/interview/{prompts,schemas}.ts` / B → `src/lib/report/{prompts,schemas}/*.ts`, `src/lib/handover/enrich.ts`.
공통 원칙은 [SKILL.md](../.claude/skills/exitos/SKILL.md) §3.

## 공통 호출 래퍼 (A)

> ⚠️ 래블업 API가 OpenAI 호환 `/chat/completions` 형식이라고 **가정**한 초안이다. 주소·모델 이름·JSON 출력 옵션(`response_format`) 지원 여부를 래블업 안내 문서로 확인한 뒤 확정한다.

```ts
// src/lib/ai/llm.ts — 서버 전용. 새 패키지 없이 fetch 로 호출
import type { z } from 'zod';

const safeJson = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

export async function chatJson<T>(opts: {
  system: string; user: string; schema: z.ZodType<T>; fixture?: T; temperature?: number;
}): Promise<T> {
  if (process.env.DEMO_MODE === 'true' && opts.fixture) return opts.fixture;
  for (let i = 0; i < 2; i++) {
    const res = await fetch(`${process.env.LABLUP_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LABLUP_API_KEY}` },
      body: JSON.stringify({
        model: process.env.LABLUP_MODEL,
        messages: [{ role: 'system', content: opts.system }, { role: 'user', content: opts.user }],
        response_format: { type: 'json_object' },   // 미지원이면 제거하고 프롬프트로 JSON만 출력하게 한다
        temperature: opts.temperature ?? 0.3,
      }),
    });
    if (!res.ok) continue;
    const text = (await res.json()).choices?.[0]?.message?.content ?? '{}';
    const parsed = opts.schema.safeParse(safeJson(text));
    if (parsed.success) return parsed.data;
  }
  throw new Error('AI_SCHEMA_FAIL'); // 호출부에서 폴백 처리
}
```

공통 system 머리말(모든 프롬프트 앞에 붙임):
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

**입력(user):**
```json
{
  "mode": "diagnosis",
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

**지시:**
```
1) missing_slots 중 매각 가치 판단에 가장 중요한 것 1개를 next_slot 으로 골라라.
   우선순위: 업종/지역 → 운영기간 → 매각 사유·희망 시기 → 희망 권리금·임대 조건(보증금·월세·관리비·만료일)
   → 점주 근무시간 → 직원 구성 → 장비 → 거래처·계정
2) next_slot 을 묻는 질문을 존댓말 40자 내외 한 문장으로 써라. 답의 단위(만원, 석, 시간)를 질문에 드러내라.
3) next_slot 의 needs_options 가 true 이면 업종에 맞는 보기 4~8개를 options 로 줘라. 아니면 options 를 비워라.
4) 업로드되지 않은 핵심 자료(pos, card_settlement, delivery, purchases)가 있고 turn 이 3 이상이면
   ask_upload 에 그 자료 종류 하나를 넣어라. 없으면 "none".
```

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

LLM이 하는 일:
1. **보기 생성:** 업종·역할별 직무, 교육 항목 보기 4~8개 (점주는 체크만 한다)
2. **산출물 문장:** 점주가 고른 항목만으로 `artifacts_preview` 를 만든다. 고르지 않은 항목을 추가하지 않는다.

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
