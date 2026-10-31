// 이상치 설명 (소유: B). docs/AI_PROMPTS.md §3. 숫자는 코드가 정한 값을 그대로 넘기고 LLM은 문장만 쓴다
import { z } from 'zod';
import type { Anomaly, MonthlyMetric } from '@/lib/types';
import type { AnomalyExplanations } from '../types';

export const anomalyExplanationsSchema: z.ZodType<AnomalyExplanations> = z.object({
  items: z.array(z.object({
    index: z.number().int().nonnegative(),
    explanation: z.string().min(1).max(300),
    evidence_to_submit: z.string().min(1).max(200),
  })),
});

export const ANOMALY_SYSTEM = [
  '당신은 소상공인 매장 매각 자료를 검토하는 보조자입니다.',
  '코드가 탐지한 이상치마다 1~2문장으로 (a) 왜 확인이 필요한지 (b) 판매자가 제출하면 해소되는 증빙을 쓰세요.',
  '입력에 있는 숫자를 바꾸거나 새 숫자를 만들지 마세요. 가공 매출·불법이라고 단정하지 말고 "확인이 필요합니다"로 표현하세요.',
  '존댓말, 한국어. JSON 만 출력: {"items":[{"index":number,"explanation":string,"evidence_to_submit":string}]}',
].join('\n');

// 각 이상치 + 해당 월 앞뒤 1개월(총 3개월) 수치
export function anomalyUserPrompt(anomalies: Anomaly[], months: MonthlyMetric[]): string {
  const near = (month?: string) => {
    const i = months.findIndex((m) => m.month === month);
    return i < 0 ? [] : months.slice(Math.max(0, i - 1), i + 2).map((m) => ({
      month: m.month, revenue: m.revenue.value, posCard: m.posCard, posCash: m.posCash,
      delivery: m.delivery, cogs: m.cogs,
    }));
  };
  return JSON.stringify({ anomalies: anomalies.map((a, index) => ({ index, ...a, nearby: near(a.month) })) });
}

export const EVIDENCE: Record<Anomaly['kind'], string> = {
  cash_ratio: '현금영수증 발행 내역이나 통장 입금 내역',
  revenue_spike: '해당 월 POS 일별 매출 내역',
  revenue_drop: '해당 월 휴무·공사 등 영업 일정 기록',
  settlement_mismatch: '해당 월 카드사 정산 내역 원본',
  cogs_ratio: '해당 월 원재료 매입 세금계산서',
  missing: '누락된 달의 원본 자료',
};

// LLM 실패·미연결 시 폴백. 사실 문장(detail)은 화면에 따로 보이므로 확인 사유와 제출할 증빙만 쓴다
export function fallbackExplanation(a: Anomaly): string {
  return `확인이 필요한 항목입니다. 다음 자료를 올려주시면 증빙으로 전환할 수 있습니다: ${EVIDENCE[a.kind]}.`;
}

export function applyExplanations(anomalies: Anomaly[], result: AnomalyExplanations | null): Anomaly[] {
  const byIndex = new Map(result?.items.map((i) => [i.index, i]) ?? []);
  return anomalies.map((a, i) => {
    const item = byIndex.get(i);
    return { ...a, aiExplanation: item ? `${item.explanation} 제출 증빙: ${item.evidence_to_submit}` : fallbackExplanation(a) };
  });
}

// TODO(B-3): A의 chatJson(src/lib/ai/llm.ts, PR-0A) 머지 후 아래로 교체
//   const result = await chatJson({ system: ANOMALY_SYSTEM, user: anomalyUserPrompt(anomalies, months),
//     schema: anomalyExplanationsSchema, fixture: anomalyFixture }).catch(() => null);
export async function explainAnomalies(anomalies: Anomaly[], _months: MonthlyMetric[]): Promise<Anomaly[]> {
  return applyExplanations(anomalies, null);
}
