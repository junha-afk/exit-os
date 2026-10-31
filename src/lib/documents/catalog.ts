// 요청할 수 있는 자료 목록 (소유: A). 어떤 자료를 언제 요청할지는 LLM이 정하고, 요청 가능한 종류는 여기서만 정한다.
// 파일 형식은 제한하지 않는다(CSV·엑셀·PDF·사진·텍스트). 올라온 파일은 LLM이 읽어 facts·재무 행으로 반영한다.
// - produces 'records' : 재무 표 → B가 분석하는 재무 행 (recordKind, targetFields 는 docs/ARCHITECTURE.md §5)
// - produces 'facts'   : 계약서·증명서·목록 → store_facts 값 (factKeys)
import type { FactKey, RecordKind } from '@/lib/types';

export interface DocKindSpec {
  kind: string;
  label: string;
  /** 무엇이 들어 있고 왜 도움이 되는지 — LLM이 요청 여부를 판단할 때 읽는다 */
  why: string;
  produces: 'records' | 'facts';
  /** produces='records' 일 때 저장할 재무 행 종류 */
  recordKind?: RecordKind | 'cash_receipt' | 'bank_deposit';
  /** 재무 행의 표준 칸 (표 파일 열 매핑 대상) */
  targetFields?: string[];
  /** produces='facts' 일 때 채울 수 있는 facts 키 */
  factKeys?: FactKey[];
}

export const DOC_KINDS = [
  // ── 재무 표 ──
  { kind: 'pos', label: 'POS·키오스크 매출 내역', produces: 'records', recordKind: 'pos',
    why: '월별 카드·현금 매출. 매출 분석의 기본 자료', targetFields: ['date', 'channel', 'amount'] },
  { kind: 'card_settlement', label: '카드사 정산 내역', produces: 'records', recordKind: 'card_settlement',
    why: 'POS 카드 매출과 대조해 매출을 증빙 확인으로 바꾼다', targetFields: ['date', 'card_company', 'amount'] },
  { kind: 'delivery', label: '배달앱 정산 내역', produces: 'records', recordKind: 'delivery',
    why: '배달 매출·수수료·실제 정산액. POS와 겹치는 매출을 찾는다',
    targetFields: ['date', 'platform', 'gross_sales', 'fees', 'net_payout', 'orders', 'included_in_pos'] },
  { kind: 'purchases', label: '식자재·원재료 매입 내역', produces: 'records', recordKind: 'purchases',
    why: '원가율과 매출 대비 매입 이상을 본다', targetFields: ['date', 'vendor', 'category', 'amount'] },
  { kind: 'fixed', label: '임대료·관리비·공과금 내역', produces: 'records', recordKind: 'fixed',
    why: '고정비 추정', targetFields: ['date', 'item', 'amount'] },
  { kind: 'payroll', label: '직원 급여·근무시간 내역', produces: 'records', recordKind: 'payroll',
    why: '인건비와 인력 구조', targetFields: ['date', 'role', 'hours', 'pay'] },
  { kind: 'cash_receipt', label: '현금영수증 발행 내역', produces: 'records', recordKind: 'cash_receipt',
    why: '현금 매출을 증빙한다. 현금 비중이 크거나 급증한 달이 있으면 특히 필요', targetFields: ['date', 'amount'] },
  { kind: 'bank_deposit', label: '사업용 통장 입금 내역', produces: 'records', recordKind: 'bank_deposit',
    why: '현금·계좌이체 매출을 증빙한다', targetFields: ['date', 'counterparty', 'amount'] },
  // ── 계약서·증명서·목록 ──
  { kind: 'lease_contract', label: '임대차계약서', produces: 'facts',
    why: '보증금·월세·관리비·계약 만료일·면적·층을 한 번에 채운다',
    factKeys: ['deposit', 'monthly_rent', 'maintenance_fee', 'lease_expiry', 'area_m2', 'floor'] },
  { kind: 'business_registration', label: '사업자등록증', produces: 'facts',
    why: '상호·개업일·업종·소재지(동까지)를 확인한다', factKeys: ['store_name', 'opened_at', 'industry', 'region'] },
  { kind: 'food_business_license', label: '영업신고증', produces: 'facts',
    why: '업종·소재지 확인. 인수 시 지위승계 대상', factKeys: ['store_name', 'industry', 'region'] },
  { kind: 'franchise_contract', label: '가맹계약서', produces: 'facts',
    why: '가맹 여부·로열티 등 인수 조건', factKeys: ['franchise_terms'] },
  { kind: 'equipment_list', label: '장비 목록·구입 영수증', produces: 'facts',
    why: '장비 이름·수량·연식·구입가. 시설권리금 계산에 쓴다', factKeys: ['equipment'] },
  { kind: 'store_photos', label: '매장 사진(홀·주방)', produces: 'facts',
    why: '좌석 수와 주요 장비를 확인한다', factKeys: ['seats', 'equipment'] },
  { kind: 'menu', label: '메뉴판', produces: 'facts',
    why: '주력 메뉴와 고객층 판단', factKeys: ['customer_segments'] },
  { kind: 'other', label: '기타 자료', produces: 'facts',
    why: '위에 없는 자료. 읽어서 채울 수 있는 정보를 찾는다', factKeys: [] },
] as const satisfies readonly DocKindSpec[];

export type DocKind = (typeof DOC_KINDS)[number]['kind'];
export const DOC_KIND_IDS = DOC_KINDS.map((d) => d.kind) as DocKind[];

export function getDocKind(kind: string): DocKindSpec | undefined {
  return (DOC_KINDS as readonly DocKindSpec[]).find((d) => d.kind === kind);
}

/** 한 매장 진단에서 LLM이 요청할 수 있는 자료 수 상한 (코드가 강제) */
export const MAX_DOCUMENT_REQUESTS = 12;
