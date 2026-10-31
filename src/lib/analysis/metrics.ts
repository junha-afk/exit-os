// 월별 지표 (소유: B). SKILL.md §2
import type { RecordKind } from '@/lib/types';
import { isIncludedInPos } from './dedupe';
import type { FinancialRecord } from './parse';

export const CARD_FEE_RATE = 0.015;   // 카드수수료: 매출의 1.5% 가정

export interface MonthBase {
  month: string;
  posCard: number; posCash: number;
  delivery: number;                   // 배달 총매출
  dedupedAmount: number;              // POS에 이미 포함된 배달 매출
  revenue: number;                    // POS + 배달 − 중복
  cardSettlement: number | null;      // 카드사 정산 합 (자료 없으면 null)
  cogs: number; labor: number; fixed: number;
  deliveryFees: number; fees: number; // fees = 배달수수료 + 카드수수료
  operatingProfit: number;
  present: Set<RecordKind>;           // 이 달에 행이 있는 자료 종류
}

const sum = (rows: FinancialRecord[], f: (r: FinancialRecord) => number = (r) => r.amount) =>
  rows.reduce((s, r) => s + f(r), 0);

// 분석 대상 월 = 매출 자료(POS·배달)가 있는 달 중 최근 12개월
export function analysisMonths(records: FinancialRecord[]): string[] {
  const months = new Set(records.filter((r) => r.kind === 'pos' || r.kind === 'delivery').map((r) => r.month));
  return [...months].sort().slice(-12);
}

export function monthlyBase(records: FinancialRecord[], months: string[]): MonthBase[] {
  const hasSettlement = records.some((r) => r.kind === 'card_settlement');
  return months.map((month) => {
    const inMonth = records.filter((r) => r.month === month);
    const of = (kind: RecordKind) => inMonth.filter((r) => r.kind === kind);
    const deliveryRows = of('delivery');

    const posCard = sum(of('pos').filter((r) => r.category === 'card'));
    const posCash = sum(of('pos').filter((r) => r.category === 'cash'));
    const delivery = sum(deliveryRows);
    const dedupedAmount = sum(deliveryRows.filter(isIncludedInPos));
    const revenue = posCard + posCash + delivery - dedupedAmount;
    const deliveryFees = sum(deliveryRows, (r) => Number(r.extra.fees ?? 0));
    const fees = deliveryFees + Math.round(revenue * CARD_FEE_RATE);
    const cogs = sum(of('purchases'));
    const labor = sum(of('payroll'));
    const fixed = sum(of('fixed'));

    return {
      month, posCard, posCash, delivery, dedupedAmount, revenue,
      cardSettlement: hasSettlement ? sum(of('card_settlement')) : null,
      cogs, labor, fixed, deliveryFees, fees,
      operatingProfit: revenue - cogs - labor - fixed - fees,
      present: new Set(inMonth.map((r) => r.kind)),
    };
  });
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
export const stdev = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
// 선형 보간 분위수 (p = 0~1)
export function quantile(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);
  return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo);
}
