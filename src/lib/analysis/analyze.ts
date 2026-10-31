// 재무 자료 + facts → AnalysisResult (소유: B). 순수 함수 — 저장·LLM 호출은 라우트가 한다
import type { AnalysisResult, Equipment, MonthlyMetric, Provenance, RecordKind, StoreFacts } from '@/lib/types';
import { detectAnomalies, REQUIRED_KINDS } from './anomalies';
import { analysisMonths, mean, monthlyBase } from './metrics';
import type { FinancialRecord } from './parse';
import { crossCheck, lowest } from './provenance';
import { dataCompleteness, ownerDependency, revenueStability } from './scores';
import { monthEndAsYear, valuation } from './valuation';

export const DEFAULT_OWNER_HOURLY_WAGE = 12_000;

const factValue = <T,>(facts: StoreFacts, key: keyof StoreFacts) => facts[key]?.value as T | undefined;

export function analyzeStore(input: {
  storeId: string;
  records: FinancialRecord[];
  facts: StoreFacts;
  hourlyWage?: number;
}): AnalysisResult | null {
  const { storeId, records, facts } = input;
  const months = analysisMonths(records);
  if (!months.length) return null;   // 매출 자료(POS·배달)가 없으면 분석하지 않는다

  const uploaded = [...new Set(records.map((r) => r.kind))] as RecordKind[];
  const bases = monthlyBase(records, months);
  const scan = detectAnomalies(bases, uploaded);

  // 월별 출처: 카드는 카드사 정산과 대조, 현금은 대조 출처 없음(🔵), 배달은 플랫폼 정산서가 원본(🟢)
  const sourceLabels: Provenance[] = [];
  const metrics: MonthlyMetric[] = bases.map((b) => {
    const parts: Provenance[] = [];
    if (b.posCard > 0) parts.push(crossCheck(b.posCard, b.cardSettlement));
    if (b.posCash > 0) parts.push('user_input');
    if (b.delivery > 0) parts.push('verified');
    sourceLabels.push(...parts);
    const reasons = scan.flagged.get(b.month);
    const provenance: Provenance = reasons ? 'needs_check' : lowest(...parts);
    const note = reasons?.join(', ');
    return {
      month: b.month,
      revenue: { value: b.revenue, provenance, ...(note && { note }) },
      posCard: b.posCard, posCash: b.posCash, delivery: b.delivery, dedupedAmount: b.dedupedAmount,
      cogs: b.cogs, labor: b.labor, fixed: b.fixed, fees: b.fees,
      // 비용은 점주가 올린 자료(단일 출처)라 이익은 최대 사용자 입력
      operatingProfit: { value: b.operatingProfit, provenance: lowest(provenance, 'user_input'), ...(note && { note }) },
    };
  });

  const revenues = bases.map((b) => b.revenue);
  const profits = bases.map((b) => b.operatingProfit);
  const avgRevenue = Math.round(mean(revenues));
  const avgProfit = Math.round(mean(profits));
  const periodNote = `최근 ${months.length}개월 평균`;
  const ownerHours = factValue<number>(facts, 'owner_weekly_hours') ?? 0;

  const presentCells = bases.reduce((s, b) => s + REQUIRED_KINDS.filter((k) => b.present.has(k)).length, 0);

  return {
    storeId,
    months: metrics,
    avgRevenue: { value: avgRevenue, provenance: lowest(...metrics.map((m) => m.revenue.provenance)), note: periodNote },
    avgOperatingProfit: { value: avgProfit, provenance: lowest(...metrics.map((m) => m.operatingProfit.provenance)), note: periodNote },
    margin: avgRevenue ? Math.round((avgProfit / avgRevenue) * 1000) / 1000 : 0,
    dedupeCount: records.filter((r) => r.kind === 'delivery' && r.extra.included_in_pos === 'Y').length,
    anomalies: scan.anomalies,
    missing: scan.missing,
    scores: {
      revenueStability: revenueStability(revenues),
      dataCompleteness: dataCompleteness(presentCells, months.length * REQUIRED_KINDS.length, sourceLabels),
      ownerDependency: ownerDependency(ownerHours, factValue<string[]>(facts, 'owner_tasks')?.length ?? 0),
    },
    valuation: valuation({
      monthlyProfits: profits,
      avgOperatingProfit: avgProfit,
      ownerWeeklyHours: ownerHours,
      hourlyWage: input.hourlyWage ?? DEFAULT_OWNER_HOURLY_WAGE,
      equipment: factValue<Equipment[]>(facts, 'equipment') ?? [],
      asOf: monthEndAsYear(months.at(-1)!),
    }),
  };
}
