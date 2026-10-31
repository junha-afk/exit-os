// 진단 진행 상태 (소유: A). 대화 기록·지금 단계·자료 요청 수. 서버 메모리(globalThis).
import type { HistoryItem, Step } from './types';

export interface InterviewState {
  history: HistoryItem[];
  current: Step | null;
  turn: number;
  requestsMade: number;
}

const g = globalThis as unknown as { __exitosInterview?: Map<string, InterviewState> };
const store = (g.__exitosInterview ??= new Map<string, InterviewState>());

export function getInterviewState(storeId: string): InterviewState {
  let s = store.get(storeId);
  if (!s) store.set(storeId, (s = { history: [], current: null, turn: 0, requestsMade: 0 }));
  return s;
}

export function resetInterviewState(storeId: string): void {
  store.set(storeId, { history: [], current: null, turn: 0, requestsMade: 0 });
}
