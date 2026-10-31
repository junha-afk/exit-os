// 진단 화면 ↔ 진단 API 사이의 타입 (소유: A)
import type { DocKind } from '@/lib/documents/catalog';
import type { FactKey, StoreFacts } from '@/lib/types';

/** 표의 한 칸에 쓰는 입력 */
export type ColumnInput =
  | { type: 'name'; maxLength: number; placeholder?: string }
  | { type: 'number'; unit: string; min?: number; max?: number }
  | { type: 'money'; optional?: boolean }
  | { type: 'choice'; options: string[] };

/** 질문마다 화면에 뜨는 입력 도구. 자유 문장 입력은 없다 */
export type InputSpec =
  | { type: 'number'; unit: string; min?: number; max?: number; step?: number }
  | { type: 'money' } // 화면 단위 만원, 저장은 원
  | { type: 'month' } // 'YYYY-MM'
  | { type: 'choice'; options: string[] }
  | { type: 'multi'; options: string[] }
  | { type: 'boolean'; allowUnknown?: boolean; labels?: [yes: string, no: string] }
  | { type: 'percent_split'; parts: { key: string; label: string }[] }
  | { type: 'table'; columns: { key: string; label: string; input: ColumnInput }[]; addLabel: string }
  | { type: 'time_range' } // { open: 'HH:mm', close: 'HH:mm' }
  | { type: 'name'; maxLength: number; placeholder?: string }; // 고유명사 칸

/** 진단 엔진이 정한 이번 턴의 할 일 */
export type Step =
  | { type: 'ask_slot'; slot: FactKey; label: string; text: string; input: InputSpec }
  | { type: 'request_document'; docKind: DocKind; label: string; text: string; reason: string };

/** 왼쪽 대화 기록 한 줄 */
export type HistoryItem =
  | { kind: 'question'; text: string }
  | { kind: 'answer'; label: string; display: string }
  | { kind: 'document'; label: string; filename: string; summary: string; filled: string[]; recordCount: number; unreadable: boolean }
  | { kind: 'declined'; label: string };

/** POST /api/ai/interview 응답 */
export interface InterviewResponse {
  facts: StoreFacts;
  step: Step | null;
  done: boolean;
  /** 0~1, 채운 슬롯 ÷ 전체 슬롯 (코드 계산) */
  progress: number;
  history: HistoryItem[];
  /** 남은 슬롯이 없어 보고서로 넘어갈 수 있음 */
  canFinish: boolean;
}
