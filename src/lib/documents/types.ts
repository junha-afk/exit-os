// 업로드 자료와 자료에서 나온 재무 행 타입 (소유: A). B는 import 만 해서 읽는다 (docs/TEAM_PLAN.md §4).
import type { DocKind } from './catalog';

/** 점주가 올린 파일 하나 */
export interface UploadedDocument {
  id: string;
  storeId: string;
  /** 시스템이 요청했던 자료 종류 */
  requestedKind: DocKind;
  /** LLM이 내용을 보고 판정한 실제 종류 */
  detectedKind: DocKind;
  filename: string;
  mime: string;
  /** 읽은 방법: 표 파일은 코드가 모든 행을 읽고(LLM은 열 매핑만), 문서·사진은 LLM이 옮겨 적음 */
  readBy: 'code_table' | 'llm_document';
  /** LLM이 남긴 1~2문장 요약 (사실만) */
  summary: string;
  /** 이 자료에서 채운 facts 키 */
  filledFacts: string[];
  /** 이 자료에서 나온 재무 행 수 */
  recordCount: number;
  unreadable: boolean;
  notes: string[];
  uploadedAt: string;
}

/** 자료에서 나온 표준 재무 행. B는 이 행으로 정리·중복 제거·출처 판정·지표 계산을 한다 */
export interface FinancialRow {
  storeId: string;
  documentId: string;
  /** catalog 의 recordKind: pos | card_settlement | delivery | purchases | fixed | payroll | cash_receipt | bank_deposit */
  kind: string;
  /** 'YYYY-MM-DD' 또는 'YYYY-MM' (원문 그대로의 정밀도) */
  date: string;
  /** 'YYYY-MM' (코드가 date 에서 만든 값) */
  month: string;
  /** catalog targetFields 기준 값. 금액은 원 단위 정수 */
  fields: Record<string, string | number | boolean | null>;
  /** code_table = 코드가 원본 표에서 읽음 / llm_document = LLM이 문서·사진에서 옮겨 적음 (B는 확인 필요로 다룬다) */
  readBy: 'code_table' | 'llm_document';
}

/** 자료 처리 상태 — 진단 엔진이 "이미 다룬 자료"를 알기 위해 쓴다 */
export interface DocumentRequestState {
  kind: DocKind;
  status: 'requested' | 'received' | 'declined';
  summary?: string;
}
