// A의 재무 행(FinancialRow) → B의 분석용 행 정규화 (소유: B). A는 자료를 읽어 저장만 하고 정리·중복 제거·월 합계는 여기서 한다
// 행 형식: docs/TEAM_PLAN.md §4, src/lib/documents/catalog.ts targetFields
import type { FinancialRow } from '@/lib/documents/types';
import type { RecordKind } from '@/lib/types';

export interface FinancialRecord {
  kind: RecordKind;
  month: string;              // 'YYYY-MM'
  category: string;           // channel / card_company / platform / vendor / item / role
  amount: number;             // 원
  extra: Record<string, string | number>;
  readByLlm: boolean;         // 문서·사진에서 LLM이 옮겨 적은 값이 섞임 → 확인 필요
}

export interface FinancialInput {
  records: FinancialRecord[];
  cashEvidence: Map<string, number>;   // month → 현금 매출 증빙액 (현금영수증·통장 입금 중 큰 값)
}

export const KIND_LABEL: Record<RecordKind, string> = {
  pos: 'POS 매출', card_settlement: '카드사 정산', delivery: '배달앱 정산',
  purchases: '원재료 매입', fixed: '임대료·공과금', payroll: '급여',
};

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
// 통장 입금 중 카드사·배달앱 정산 입금은 현금 증빙이 아니다
const NOT_CASH_DEPOSIT = /카드|card|배민|배달|쿠팡|요기요|땡겨요|정산|페이/i;

// 금액은 A가 원 단위 숫자로 주지만 문서에서 읽은 값은 문자열일 수 있다. 못 읽으면 null
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[,\s원₩]/g, ''));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}
const text = (v: unknown) => String(v ?? '').trim() || '미상';
// 파일마다 표기가 달라 코드가 판정한다 (Y·예·포함·TRUE…)
const yes = (v: unknown) => /^(y|yes|true|1|예|네|포함|o|○)$/i.test(String(v ?? '').trim());
// 현금·계좌이체만 현금으로 보고, 나머지(카드·간편결제 등)는 카드사 정산과 대조되는 카드로 본다
const channel = (v: unknown) => (/^cash$|현금|계좌|이체/i.test(String(v ?? '')) ? 'cash' : 'card');

type Normalized = Pick<FinancialRecord, 'category' | 'amount' | 'extra'>;

function normalize(kind: RecordKind, f: FinancialRow['fields']): Normalized | null {
  const n = (k: string) => num(f[k]) ?? 0;
  let row: Normalized;
  switch (kind) {
    case 'pos': row = { category: channel(f.channel), amount: n('amount'), extra: {} }; break;
    case 'card_settlement': row = { category: text(f.card_company), amount: n('amount'), extra: {} }; break;
    case 'delivery': row = {
      category: text(f.platform), amount: n('gross_sales'),
      extra: { fees: n('fees'), net_payout: n('net_payout'), orders: n('orders'), included_in_pos: yes(f.included_in_pos) ? 'Y' : 'N' },
    }; break;
    case 'purchases': row = { category: text(f.vendor), amount: n('amount'), extra: { category: text(f.category) } }; break;
    case 'fixed': row = { category: text(f.item), amount: n('amount'), extra: {} }; break;
    case 'payroll': row = { category: text(f.role), amount: n('pay'), extra: { hours: n('hours') } }; break;
  }
  return row.amount > 0 ? row : null;
}

const RECORD_KINDS = new Set<string>(['pos', 'card_settlement', 'delivery', 'purchases', 'fixed', 'payroll']);

export function fromFinancialRows(rows: FinancialRow[]): FinancialInput {
  // 같은 종류·같은 달 자료를 다시 올리면 마지막 자료만 쓴다 (두 번 올려도 이중 집계되지 않게, 나눠 올린 달은 합친다)
  const latestDoc = new Map<string, string>();
  for (const r of rows) latestDoc.set(`${r.kind}|${r.month}`, r.documentId);
  const current = rows.filter((r) => MONTH.test(r.month) && latestDoc.get(`${r.kind}|${r.month}`) === r.documentId);

  // 일별 행도 월·항목별로 합친다 → "중복 제거 N건" 은 월·플랫폼 단위
  const merged = new Map<string, FinancialRecord>();
  const receipts = new Map<string, number>();
  const deposits = new Map<string, number>();
  const add = (m: Map<string, number>, month: string, x: number) => m.set(month, (m.get(month) ?? 0) + x);

  for (const r of current) {
    if (r.kind === 'cash_receipt') { add(receipts, r.month, num(r.fields.amount) ?? 0); continue; }
    if (r.kind === 'bank_deposit') {
      if (!NOT_CASH_DEPOSIT.test(String(r.fields.counterparty ?? ''))) add(deposits, r.month, num(r.fields.amount) ?? 0);
      continue;
    }
    if (!RECORD_KINDS.has(r.kind)) continue;
    const kind = r.kind as RecordKind;
    const row = normalize(kind, r.fields);
    if (!row) continue;
    const key = `${kind}|${r.month}|${row.category}|${row.extra.included_in_pos ?? ''}`;
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, { kind, month: r.month, ...row, readByLlm: r.readBy === 'llm_document' });
      continue;
    }
    prev.amount += row.amount;
    prev.readByLlm ||= r.readBy === 'llm_document';
    for (const [k, v] of Object.entries(row.extra)) {
      if (typeof v === 'number') prev.extra[k] = Number(prev.extra[k] ?? 0) + v;
    }
  }

  const cashEvidence = new Map<string, number>();
  for (const month of new Set([...receipts.keys(), ...deposits.keys()])) {
    cashEvidence.set(month, Math.max(receipts.get(month) ?? 0, deposits.get(month) ?? 0));
  }
  return { records: [...merged.values()], cashEvidence };
}
