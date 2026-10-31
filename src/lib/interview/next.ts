// 진단 엔진 (소유: A). 서버 전용. 이번 턴의 할 일(질문 / 자료 요청 / 끝)을 정한다.
// LLM이 고르고, 코드가 검사한다. LLM이 실패하거나 엉뚱한 값을 내면 slots.ts 의 기본 순서로 진행한다.
import { chatJson } from '@/lib/ai/llm';
import { DOC_KINDS, MAX_DOCUMENT_REQUESTS, getDocKind, type DocKind } from '@/lib/documents/catalog';
import { getDocumentStates, markRequested } from '@/lib/documents/repo';
import { getFacts } from '@/lib/facts/repo';
import type { StoreFacts } from '@/lib/types';
import { DIAGNOSIS_SYSTEM_PROMPT, buildDiagnosisUserMessage } from './prompts';
import { DiagnosisNextSchema, type DiagnosisNext } from './schemas';
import { SLOTS, SLOT_BY_KEY, type SlotDef } from './slots';
import { getInterviewState } from './state';
import type { InputSpec, InterviewResponse, Step } from './types';

const CATALOG_FOR_PROMPT = DOC_KINDS.map((d) => ({
  kind: d.kind,
  label: d.label,
  why: d.why,
  fills: 'factKeys' in d ? [...d.factKeys] : [d.recordKind],
}));

export function missingSlots(facts: StoreFacts): SlotDef[] {
  return SLOTS.filter((s) => facts[s.key] === undefined);
}

export function progressOf(facts: StoreFacts): number {
  return (SLOTS.length - missingSlots(facts).length) / SLOTS.length;
}

/** 지금 단계가 아직 유효한지 (질문한 슬롯이 아직 비었거나, 요청한 자료가 아직 처리 전) */
async function isCurrentValid(storeId: string, step: Step | null, facts: StoreFacts): Promise<boolean> {
  if (!step) return false;
  if (step.type === 'ask_slot') return facts[step.slot] === undefined;
  const states = await getDocumentStates(storeId);
  return states.find((s) => s.kind === step.docKind)?.status === 'requested';
}

function slotStep(slot: SlotDef, text?: string, llmOptions?: string[]): Step {
  let input: InputSpec = slot.input;
  if (slot.needsOptions && (input.type === 'multi' || input.type === 'choice')) {
    const options = llmOptions && llmOptions.length >= 3 ? llmOptions : slot.defaultOptions ?? [];
    input = { ...input, options };
  }
  return { type: 'ask_slot', slot: slot.key, label: slot.label, text: text?.trim() || slot.question, input };
}

/** 이번 턴의 할 일을 정해 상태에 기록하고 응답을 만든다 */
export async function buildTurn(storeId: string, opts: { forceNew?: boolean } = {}): Promise<InterviewResponse> {
  const state = getInterviewState(storeId);
  const facts = await getFacts(storeId);
  const missing = missingSlots(facts);

  if (opts.forceNew || !(await isCurrentValid(storeId, state.current, facts))) {
    state.current = await decideNext(storeId, facts, missing, state.turn, state.requestsMade);
    if (state.current) {
      state.turn += 1;
      state.history.push({ kind: 'question', text: state.current.text });
      if (state.current.type === 'request_document') {
        state.requestsMade += 1;
        await markRequested(storeId, state.current.docKind);
      }
    }
  }

  return {
    facts,
    step: state.current,
    done: state.current === null,
    progress: progressOf(facts),
    history: state.history,
    canFinish: missing.length === 0,
  };
}

async function decideNext(
  storeId: string, facts: StoreFacts, missing: SlotDef[], turn: number, requestsMade: number,
): Promise<Step | null> {
  const states = await getDocumentStates(storeId);
  const handled = new Set(states.map((s) => s.kind));
  const requestsLeft = Math.max(0, MAX_DOCUMENT_REQUESTS - requestsMade);

  let llm: DiagnosisNext | null = null;
  try {
    llm = await chatJson({
      system: DIAGNOSIS_SYSTEM_PROMPT,
      user: buildDiagnosisUserMessage({
        known: Object.fromEntries(Object.entries(facts).map(([k, v]) => [k, v?.value])),
        missing_slots: missing.map((s) => ({ slot: s.key, label: s.label, input: s.input.type, needs_options: s.needsOptions })),
        documents: states.filter((s) => s.status !== 'requested').map((s) => ({ kind: s.kind, status: s.status as 'received' | 'declined', summary: s.summary })),
        doc_catalog: CATALOG_FOR_PROMPT,
        requests_left: requestsLeft,
        turn,
      }),
      schema: DiagnosisNextSchema,
    });
  } catch {
    llm = null; // 폴백
  }

  // LLM 결과 검사
  if (llm?.action === 'request_document' && llm.doc_kind && requestsLeft > 0) {
    const kind = getDocKind(llm.doc_kind);
    if (kind && !handled.has(kind.kind as DocKind)) {
      return {
        type: 'request_document',
        docKind: kind.kind as DocKind,
        label: kind.label,
        text: llm.question.trim() || `${kind.label}을(를) 올려주시겠어요?`,
        reason: llm.reason.trim() || kind.why,
      };
    }
  }
  if (llm?.action === 'ask_slot' && llm.next_slot) {
    const slot = SLOT_BY_KEY[llm.next_slot as keyof typeof SLOT_BY_KEY];
    if (slot && missing.includes(slot)) return slotStep(slot, llm.question, llm.options);
  }

  // 폴백: 기본 순서의 첫 빈 슬롯
  if (missing.length) {
    const slot = missing[0];
    const options = llm?.action === 'ask_slot' && llm.next_slot === slot.key ? llm.options : undefined;
    return slotStep(slot, undefined, options);
  }
  return null; // 끝
}
