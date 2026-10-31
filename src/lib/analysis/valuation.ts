// 권리금 추정 범위 (소유: B). SKILL.md §2. 화면에는 항상 AiEstimateNotice 를 같이 둔다
import type { Equipment, Valuation } from '@/lib/types';
import { quantile } from './metrics';

export const WEEKS_PER_MONTH = 4.345;
export const EQUIPMENT_LIFE_YEARS = 5;

// 조정 영업이익 = 월 영업이익 − 점주 주당 근무시간 × 4.345 × 점주 대체 시급
export function adjustedMonthlyProfit(avgOperatingProfit: number, ownerWeeklyHours: number, hourlyWage: number): number {
  return Math.round(avgOperatingProfit - ownerWeeklyHours * WEEKS_PER_MONTH * hourlyWage);
}

// 시설권리금 = 장비 잔존가치 합 (정액법, 내용연수 5년, 구입은 그해 1월로 본다)
// asOf = 기준 시점의 소수 연도 (예: 2026-09 말 → 2026.75)
export function facilityValue(equipment: Equipment[], asOf: number): number {
  return Math.round(equipment.reduce((s, e) => {
    if (!e.purchasePrice) return s;
    const remaining = Math.max(0, 1 - (asOf - e.year) / EQUIPMENT_LIFE_YEARS);
    return s + e.purchasePrice * Math.min(1, remaining);
  }, 0));
}

// 'YYYY-MM' 달의 말일 → 소수 연도
export const monthEndAsYear = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return y + m / 12;
};

export function valuation(input: {
  monthlyProfits: number[];
  avgOperatingProfit: number;
  ownerWeeklyHours: number;
  hourlyWage: number;
  equipment: Equipment[];
  asOf: number;
}): Valuation {
  const adjusted = adjustedMonthlyProfit(input.avgOperatingProfit, input.ownerWeeklyHours, input.hourlyWage);
  const goodwillLow = Math.max(0, adjusted * 12);
  const goodwillHigh = Math.max(0, adjusted * 24);
  const facility = facilityValue(input.equipment, input.asOf);
  return {
    goodwillLow, goodwillHigh, facilityValue: facility,
    premiumLow: goodwillLow + facility, premiumHigh: goodwillHigh + facility,
    monthlyProfitP25: Math.round(quantile(input.monthlyProfits, 0.25)),
    monthlyProfitMedian: Math.round(quantile(input.monthlyProfits, 0.5)),
    monthlyProfitP75: Math.round(quantile(input.monthlyProfits, 0.75)),
    adjustedMonthlyProfit: adjusted,
  };
}
