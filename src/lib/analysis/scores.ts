// AI 점수 0~100 (소유: B). 계산은 코드, LLM은 설명만. SKILL.md §2
import type { Provenance } from '@/lib/types';
import { mean, stdev } from './metrics';

const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)));

// 매출 안정성: 100 − 변동계수(CV)×200
export function revenueStability(revenues: number[]): number {
  const m = mean(revenues);
  return m > 0 ? clamp(100 - (stdev(revenues) / m) * 200) : 0;
}

// 자료 완성도: (월 × 필수 자료 중 있는 칸 비율) × 0.7 + verified 비율 × 0.3
// verified 비율 = 월별 매출 구성(카드·현금·배달) 출처 중 verified 인 비율
export function dataCompleteness(presentCells: number, totalCells: number, sourceLabels: Provenance[]): number {
  if (!totalCells) return 0;
  const verified = sourceLabels.length ? sourceLabels.filter((p) => p === 'verified').length / sourceLabels.length : 0;
  return clamp((presentCells / totalCells) * 70 + verified * 30);
}

// 점주 전담 업무가 이 개수 이상이면 비율 1로 본다
export const OWNER_TASKS_FULL = 5;

// 운영 의존도(높을수록 위험): 점주 주 근무시간/60 × 60 + 점주 전담 업무 비율 × 40
export function ownerDependency(ownerWeeklyHours: number, ownerTaskCount: number): number {
  return clamp((Math.min(ownerWeeklyHours, 60) / 60) * 60 + Math.min(1, ownerTaskCount / OWNER_TASKS_FULL) * 40);
}
