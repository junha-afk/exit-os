# ExitOS Gemini 프롬프트 명세

소유: **D (AI 담당)**. 코드 위치: `src/lib/ai/prompts/*.ts`, 스키마: `src/lib/ai/schemas/*.ts`.
공통 원칙은 [SKILL.md](../.claude/skills/exitos/SKILL.md) §3.

## 공통 호출 래퍼

```ts
// src/lib/ai/gemini.ts
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function generateJson<T>(opts: {
  system: string; user: string; responseSchema: object; zod: z.ZodType<T>; fixture?: string;
}): Promise<T> {
  if (process.env.DEMO_MODE === 'true' && opts.fixture) return loadFixture(opts.fixture);
  for (let i = 0; i < 2; i++) {
    const res = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
      contents: opts.user,
      config: {
        systemInstruction: opts.system,
        responseMimeType: 'application/json',
        responseSchema: opts.responseSchema,
        temperature: 0.3,
      },
    });
    const parsed = opts.zod.safeParse(JSON.parse(res.text ?? '{}'));
    if (parsed.success) return parsed.data;
  }
  throw new Error('AI_SCHEMA_FAIL'); // 호출부에서 폴백 문구 처리
}
```

공통 system 머리말(모든 프롬프트 앞에 붙임):
```
너는 소상공인 매장 양도를 돕는 ExitOS의 AI 분석가다.
- 한국어 존댓말, 짧고 구체적으로.
- 제공된 숫자를 절대 바꾸거나 새로 계산하지 않는다. 숫자가 필요하면 입력에 있는 값만 인용한다.
- 법률·세무 판단을 단정하지 않는다. "확인이 필요합니다", "전문가 확인을 권장합니다"로 표현한다.
- 입력에 없는 사실을 지어내지 않는다. 모르면 질문하거나 "자료 없음"이라고 쓴다.
```

---

## 1. 진단 인터뷰 (`interview.diagnosis`)

**입력(user):**
```json
{
  "mode": "diagnosis",
  "known": { "industry": {"value":"카페","provenance":"user_input"}, "...": "..." },
  "missing_slots": ["opened_at","sale_reason","lease_expiry","owner_weekly_hours", "..."],
  "uploaded": ["pos","delivery"],
  "last_answer": "망원동에서 4년째 하고 있어요"
}
```

**지시:**
```
1) last_answer에서 추출 가능한 슬롯 값을 extracted_patch로 반환하라. 확신 없는 값은 넣지 마라.
2) missing_slots 중 매각 가치 판단에 가장 중요한 것 1개를 골라 다음 질문을 만들어라.
   우선순위: 업종/지역 → 운영기간 → 매각 사유·희망 시기 → 임대차(보증금·월세·만료일) → 점주 근무시간 → 직원 구성 → 장비 → 거래처·계정
3) 업로드되지 않은 핵심 자료(pos, card_settlement, delivery, purchases)가 있으면 3번째 질문쯤에 업로드를 요청하라.
4) 선택지로 답할 수 있으면 quick_replies 2~4개를 제공하라.
5) 필수 슬롯이 모두 채워지면 done=true.
```

**응답 스키마:**
```json
{
  "type": "object",
  "properties": {
    "extracted_patch": { "type": "object", "description": "slot -> value" },
    "next_question": { "type": "string" },
    "quick_replies": { "type": "array", "items": { "type": "string" } },
    "ask_upload": { "type": "string", "enum": ["none","pos","card_settlement","delivery","purchases","fixed","payroll"] },
    "done": { "type": "boolean" }
  },
  "required": ["extracted_patch","next_question","quick_replies","done"]
}
```
> Gemini `responseSchema` 는 자유 키 object 지원이 제한적일 수 있음 → 필요시 `extracted_patch` 를 `[{key, value}]` 배열로 바꾼다.

## 2. 노하우 인터뷰 (`interview.knowhow`) — P2

같은 엔진, 슬롯만 다름: `staff_roles[]{role, duties[], skills[]}`, `owner_tasks[]`, `training_items[]`, `suppliers[]{name, items, order_cycle, contact_role}`, `digital_accounts[]{service, purpose}`.
추가 출력: `artifacts_preview` = `{ role_manual[], training_checklist[], owner_burden_summary, supplier_handover[] }` → 우측 패널에 실시간 표시.

## 3. 이상치 설명 (`anomaly.explain`)

**입력:** 코드가 탐지한 `Anomaly[]` + 해당 월 주변 3개월 수치.
**지시:** 각 이상치에 대해 1~2문장으로 (a) 왜 확인이 필요한지 (b) 판매자가 제출하면 해소되는 증빙을 제시. 가공 매출이라고 단정 금지.
**예시 출력:** "2026-08 현금 매출이 평소의 약 8배입니다. 카드사 정산과 대조할 수 없어 확인이 필요합니다. 현금영수증 발행 내역이나 통장 입금 내역을 올려주시면 증빙으로 전환됩니다."
**스키마:** `{ "items": [{ "index": number, "explanation": string, "evidence_to_submit": string }] }`

## 4. 매각 보고서 (`report.seller`)

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
지시 요점: 강점은 증빙(🟢) 수치 위주로 인용, 위험은 🟠 항목과 운영 의존도에서 도출, `seller_todo` 는 "확인 필요"를 "증빙 확인"으로 바꾸는 행동 중심.

## 5. 구매자 리스크 보고서 (`report.buyer_risk`) — P1

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

## 6. 인수인계 업무 보강 (`handover.enrich`) — P1

**입력:** `generate.ts` 가 만든 `HandoverTask[]` (title, category, stage) + 업종.
**출력:** 각 task에 `description`(1문장) + `checklist`(2~4개). 새 task 추가 금지, 순서·stage 변경 금지.

---

## Fixture (DEMO_MODE)

`src/lib/ai/fixtures/` 에 데모 시나리오 응답을 저장: `interview_turn_{1..7}.json`, `anomaly.json`, `report_seller.json`, `risk.json`, `handover_enrich.json`.
리허설 때 실제 응답을 한 번 받아 저장해 두면 발표 중 네트워크/쿼터 문제를 피할 수 있다.
