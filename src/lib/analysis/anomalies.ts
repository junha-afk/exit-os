// 이상치·누락 탐지 (소유: B). 코드가 사실 문장을 만들고, LLM은 설명만 덧붙인다. SKILL.md §2
import { formatKRW } from '@/lib/format';
import type { Anomaly, RecordKind } from '@/lib/types';
import { mean, quantile, stdev, type MonthBase } from './metrics';
import { KIND_LABEL } from './parse';
import { MATCH_TOLERANCE, mismatchRatio } from './provenance';

// 자료 완성도·누락 판정에 쓰는 필수 자료 5종 (카드사 정산은 대조용이라 제외)
export const REQUIRED_KINDS: RecordKind[] = ['pos', 'delivery', 'purchases', 'fixed', 'payroll'];

const pct = (x: number) => `${x > 0 ? '+' : ''}${(x * 100).toFixed(1)}%`;

export interface AnomalyScan {
  anomalies: Anomaly[];
  missing: string[];
  flagged: Map<string, string[]>;     // month → 확인 필요 사유 (출처 라벨 note 로 쓴다)
}

// cashVerified = 현금영수증·통장 입금으로 현금 매출이 확인된 달 → 현금 비중 이상치에서 뺀다
export function detectAnomalies(months: MonthBase[], uploaded: RecordKind[], cashVerified = new Set<string>()): AnomalyScan {
  const anomalies: Anomaly[] = [];
  const missing: string[] = [];
  const flagged = new Map<string, string[]>();
  const flag = (month: string, reason: string) => flagged.set(month, [...(flagged.get(month) ?? []), reason]);

  // 필수 자료 누락: 종류 전체가 없으면 한 줄, 일부 달만 없으면 달마다
  for (const kind of REQUIRED_KINDS) {
    if (!uploaded.includes(kind)) { missing.push(`${KIND_LABEL[kind]} 자료 없음`); continue; }
    for (const m of months) {
      if (m.present.has(kind)) continue;
      missing.push(`${m.month} ${KIND_LABEL[kind]}`);
      anomalies.push({ month: m.month, kind: 'missing', severity: 'medium', detail: `${m.month} ${KIND_LABEL[kind]} 자료 누락` });
      flag(m.month, `${KIND_LABEL[kind]} 누락`);
    }
  }

  const revs = months.map((m) => m.revenue);
  const revMean = mean(revs);
  const revSd = stdev(revs);
  const cashRatio = (m: MonthBase) => (m.revenue ? m.posCash / m.revenue : 0);
  const withCogs = months.filter((m) => m.cogs > 0);
  const cogsAvg = mean(withCogs.map((m) => m.revenue / m.cogs));

  for (const m of months) {
    // 월매출: 12개월 평균 대비 ±40% 초과 또는 ±2σ 초과
    const dev = revMean ? (m.revenue - revMean) / revMean : 0;
    if (Math.abs(dev) > 0.4 || (revSd > 0 && Math.abs(m.revenue - revMean) > 2 * revSd)) {
      anomalies.push({
        month: m.month, kind: dev > 0 ? 'revenue_spike' : 'revenue_drop', severity: 'medium',
        detail: `${m.month} 매출 ${formatKRW(m.revenue)}으로 12개월 평균(${formatKRW(revMean)}) 대비 ${pct(dev)}`,
      });
      flag(m.month, dev > 0 ? '매출 급증' : '매출 급감');
    }

    // 현금 매출 비중: 다른 달 중앙값의 3배 이상 (판례의 가공 매출 패턴)
    const usual = quantile(months.filter((o) => o !== m).map(cashRatio), 0.5);
    if (usual > 0 && cashRatio(m) >= usual * 3 && !cashVerified.has(m.month)) {
      anomalies.push({
        month: m.month, kind: 'cash_ratio', severity: 'high',
        detail: `${m.month} 현금 매출 ${formatKRW(m.posCash)} (매출의 ${(cashRatio(m) * 100).toFixed(1)}%, 평소 ${(usual * 100).toFixed(1)}%). 현금영수증·통장 입금 내역 제출 시 증빙 전환 가능`,
      });
      flag(m.month, '현금 매출 비중 급증');
    }

    // POS 카드매출 ↔ 카드사 정산 3% 초과 불일치
    if (m.cardSettlement !== null && m.posCard > 0) {
      const r = mismatchRatio(m.posCard, m.cardSettlement);
      if (r > MATCH_TOLERANCE) {
        anomalies.push({
          month: m.month, kind: 'settlement_mismatch', severity: 'medium',
          detail: `${m.month} POS 카드매출 ${formatKRW(m.posCard)} ↔ 카드사 정산 ${formatKRW(m.cardSettlement)} (${(r * 100).toFixed(1)}% 불일치)`,
        });
        flag(m.month, '카드 정산 불일치');
      }
    }

    // 원재료 매입 대비 매출 비율: 평균 대비 ±30% 초과
    if (m.cogs > 0 && cogsAvg > 0) {
      const ratio = m.revenue / m.cogs;
      const d = (ratio - cogsAvg) / cogsAvg;
      if (Math.abs(d) > 0.3) {
        anomalies.push({
          month: m.month, kind: 'cogs_ratio', severity: 'medium',
          detail: `${m.month} 매출/원재료 매입 비율 ${ratio.toFixed(2)} (평균 ${cogsAvg.toFixed(2)}, ${pct(d)})`,
        });
        flag(m.month, '매입 대비 매출 비율 이상');
      }
    }
  }

  return { anomalies, missing, flagged };
}
