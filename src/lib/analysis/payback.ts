// 투자금 회수 기간 (소유: B). 클라이언트 시뮬레이터에서도 쓰므로 서버 전용 모듈을 import 하지 않는다. SKILL.md §2
import type { PaybackScenario, Valuation } from '@/lib/types';

// (희망 권리금 + 예상 초기 비용) ÷ 월 영업이익. 보증금은 회수 가능하므로 넣지 않는다. 이익이 0 이하면 회수 불가(null)
export function paybackMonths(premium: number, initialCost: number, monthlyProfit: number): number | null {
  if (monthlyProfit <= 0) return null;
  return Math.round(((premium + initialCost) / monthlyProfit) * 10) / 10;
}

// 보수 = 월이익 하위 25% / 기준 = 중앙값 / 낙관 = 상위 25%
export function paybackScenarios(premium: number, initialCost: number, v: Valuation): PaybackScenario[] {
  return ([['보수', v.monthlyProfitP25], ['기준', v.monthlyProfitMedian], ['낙관', v.monthlyProfitP75]] as const)
    .map(([label, monthlyProfit]) => ({
      label, monthlyProfit,
      months: paybackMonths(premium, initialCost, monthlyProfit) ?? Number.POSITIVE_INFINITY,
    }));
}
