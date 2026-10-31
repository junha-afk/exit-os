// 재무 CSV 6종 → 표준 행(financial_records) 정규화 (소유: B). 템플릿: docs/ARCHITECTURE.md §5
import Papa from 'papaparse';
import { z } from 'zod';
import type { RecordKind } from '@/lib/types';
import { dedupeKey } from './dedupe';

export interface FinancialRecord {
  kind: RecordKind;
  month: string;              // 'YYYY-MM'
  category: string;           // channel / card_company / platform / vendor / item / role
  amount: number;             // 원
  extra: Record<string, string | number>;
  dedupeKey: string;
}

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const won = z.coerce.number().int().nonnegative();
const text = z.string().trim().min(1);

const ROW = {
  pos: z.object({ month, channel: z.enum(['card', 'cash']), amount: won }),
  card_settlement: z.object({ month, card_company: text, amount: won }),
  delivery: z.object({
    month, platform: text, gross_sales: won, fees: won, net_payout: won,
    orders: won, included_in_pos: z.enum(['Y', 'N']),
  }),
  purchases: z.object({ month, vendor: text, category: text, amount: won }),
  fixed: z.object({ month, item: text, amount: won }),
  payroll: z.object({ month, role: text, hours: won, pay: won }),
} satisfies Record<RecordKind, z.ZodType>;

export const KIND_LABEL: Record<RecordKind, string> = {
  pos: 'POS 매출', card_settlement: '카드사 정산', delivery: '배달앱 정산',
  purchases: '원재료 매입', fixed: '임대료·공과금', payroll: '급여',
};

// 행 하나를 (category, amount, extra) 로 바꾼다
function normalize(kind: RecordKind, r: Record<string, string | number>): Pick<FinancialRecord, 'category' | 'amount' | 'extra'> {
  switch (kind) {
    case 'pos': return { category: String(r.channel), amount: Number(r.amount), extra: {} };
    case 'card_settlement': return { category: String(r.card_company), amount: Number(r.amount), extra: {} };
    case 'delivery': return {
      category: String(r.platform), amount: Number(r.gross_sales),
      extra: { fees: r.fees, net_payout: r.net_payout, orders: r.orders, included_in_pos: r.included_in_pos },
    };
    case 'purchases': return { category: String(r.vendor), amount: Number(r.amount), extra: { category: r.category } };
    case 'fixed': return { category: String(r.item), amount: Number(r.amount), extra: {} };
    case 'payroll': return { category: String(r.role), amount: Number(r.pay), extra: { hours: r.hours } };
  }
}

export type ParseResult =
  | { ok: true; records: FinancialRecord[]; duplicates: number; warnings: string[] }
  | { ok: false; error: string };

export function parseFinancialCsv(kind: RecordKind, csv: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csv.replace(/^﻿/, ''), {
    header: true, skipEmptyLines: true, transformHeader: (h) => h.trim(),
  });
  const schema = ROW[kind];
  const required = Object.keys(schema.shape);
  const missingCols = required.filter((c) => !parsed.meta.fields?.includes(c));
  if (missingCols.length) {
    return { ok: false, error: `${KIND_LABEL[kind]} 템플릿과 컬럼이 다릅니다. 필요한 컬럼: ${required.join(', ')}` };
  }

  const warnings: string[] = [];
  const badRows: number[] = [];
  const seen = new Set<string>();
  const records: FinancialRecord[] = [];
  let duplicates = 0;

  parsed.data.forEach((raw, i) => {
    const row = schema.safeParse(raw);
    if (!row.success) { badRows.push(i + 2); return; }   // +2 = 헤더 줄 + 1부터 세기
    const r = row.data as Record<string, string | number>;
    const n = normalize(kind, r);
    const key = dedupeKey(kind, String(r.month), n.category, n.amount);
    if (seen.has(key)) { duplicates++; return; }
    seen.add(key);
    records.push({ kind, month: String(r.month), ...n, dedupeKey: key });
  });

  if (!records.length) return { ok: false, error: `${KIND_LABEL[kind]}: 읽을 수 있는 행이 없습니다.` };
  if (badRows.length) warnings.push(`형식이 맞지 않아 ${badRows.length}행을 건너뛰었습니다 (줄 ${badRows.slice(0, 5).join(', ')}${badRows.length > 5 ? ' …' : ''})`);
  for (const m of monthGaps(records.map((r) => r.month))) warnings.push(`${m} ${KIND_LABEL[kind]} 자료 누락`);
  return { ok: true, records, duplicates, warnings };
}

// 첫 달~마지막 달 사이에 빠진 달
export function monthGaps(months: string[]): string[] {
  const have = new Set(months);
  const sorted = [...have].sort();
  if (sorted.length < 2) return [];
  return monthRange(sorted[0], sorted.at(-1)!).filter((m) => !have.has(m));
}

export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    if (++m > 12) { m = 1; y++; }
  }
  return out;
}
