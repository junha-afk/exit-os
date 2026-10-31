// 구매자 리스크 보고서 (소유: B). docs/AI_PROMPTS.md §5
// 입력은 filterListingForViewer 를 통과한 ListingView 만 — 잠긴 필드는 값이 없으므로 새어 나갈 수 없다
import { z } from 'zod';
import { chatJson } from '@/lib/ai/llm';
import { formatKRW, formatKRWRange } from '@/lib/format';
import { isLocked, type Anomaly, type Gated, type ListingView } from '@/lib/types';
import { monthsBetween } from '../facts';
import type { BuyerRiskReport, RiskLevel } from '../types';
import { EVIDENCE } from './anomaly';

const level = z.enum(['low', 'medium', 'high']);
export const buyerRiskReportSchema: z.ZodType<BuyerRiskReport> = z.object({
  overall: z.object({ level, one_liner: z.string().min(1).max(200) }),
  risks: z.array(z.object({
    title: z.string().min(1).max(60), level, why: z.string().min(1).max(400), question_to_seller: z.string().min(1).max(200),
  })).max(10),
  value_opinion: z.string().min(1).max(500),
  due_diligence_checklist: z.array(z.string().min(1)).max(12),
});

export const RISK_SYSTEM = [
  '당신은 소상공인 매장 인수를 검토하는 구매자를 돕는 보조자입니다.',
  '입력의 listing 은 구매자가 볼 수 있는 정보만 담고 있습니다. {"locked":true} 인 항목은 내용을 추측하지 말고 "구독 후 확인 가능"이라고 쓰세요.',
  '숫자를 바꾸거나 새로 계산하지 마세요. 금액은 입력의 *_text 표기를 그대로 쓰세요. value_opinion 은 입력의 추정 범위를 인용해 희망가가 범위 안/밖인지 쓰세요.',
  'question_to_seller 는 실사 때 판매자에게 그대로 물어볼 수 있는 문장으로 쓰세요.',
  '법률 판단("불법", "무효")이나 가공 매출 단정은 금지합니다. "확인이 필요한 항목", "전문가 확인 권장"으로 표현하세요.',
].join('\n');

const open = <T,>(v: Gated<T>): T | undefined => (isLocked(v) ? undefined : v);

export function riskUserPrompt(view: ListingView): string {
  const f = view.fields;
  const valuation = open(f.valuation);
  return JSON.stringify({
    viewer: view.viewer,
    premium_ask_text: formatKRW(open(f.premiumAsk)?.value ?? 0),
    valuation_range_text: valuation ? formatKRWRange(valuation.premiumLow, valuation.premiumHigh) : { locked: true },
    listing: f,
  });
}

const RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };
const maxLevel = (ls: RiskLevel[]): RiskLevel => ls.reduce<RiskLevel>((a, b) => (RANK[b] > RANK[a] ? b : a), 'low');

const KIND_TITLE: Record<Anomaly['kind'], string> = {
  cash_ratio: '현금 매출 급증', revenue_spike: '매출 급증', revenue_drop: '매출 급감',
  settlement_mismatch: '카드 정산 불일치', cogs_ratio: '매입 대비 매출 이상', missing: '자료 누락',
};
const KIND_ORDER: Anomaly['kind'][] = ['cash_ratio', 'settlement_mismatch', 'revenue_spike', 'revenue_drop', 'cogs_ratio', 'missing'];

const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// LLM 실패·미연결 시 폴백: 볼 수 있는 필드만으로 코드가 만든다
export function fallbackRiskReport(view: ListingView, today = new Date()): BuyerRiskReport {
  const f = view.fields;
  const risks: BuyerRiskReport['risks'] = [];
  const checklist: string[] = [];
  const financialLocked = isLocked(f.riskFactors);

  // 재무 이상치: 같은 달은 하나로 묶는다
  const anomalies = open(f.riskFactors) ?? [];
  const byMonth = new Map<string, Anomaly[]>();
  for (const a of anomalies) byMonth.set(a.month ?? '기간 전체', [...(byMonth.get(a.month ?? '기간 전체') ?? []), a]);
  for (const [month, group] of byMonth) {
    const top = [...group].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))[0];
    risks.push({
      title: `${month} ${KIND_TITLE[top.kind]}`,
      level: maxLevel(group.map((a) => a.severity)),
      why: group.map((a) => a.detail).join(' / '),
      question_to_seller: `${month} ${EVIDENCE[top.kind]} 확인이 가능할까요?`,
    });
    checklist.push(`${month} ${EVIDENCE[top.kind]}`);
  }

  const scores = open(f.scores);
  const owner = open(f.ownerWeeklyHours);
  if (scores && scores.ownerDependency >= 70) {
    risks.push({
      title: '점주 의존도 높음',
      level: scores.ownerDependency >= 85 ? 'high' : 'medium',
      why: `운영 의존도 점수가 ${scores.ownerDependency}점입니다.${owner ? ` 점주가 주 ${owner.value}시간 근무합니다${owner.note ? ` (${owner.note})` : ''}.` : ''} 인수 후 같은 운영을 유지하려면 인력이나 교육이 더 필요할 수 있습니다.`,
      question_to_seller: '점주님이 직접 하시는 업무를 직원에게 넘기려면 어떤 교육이 얼마나 필요할까요?',
    });
  }

  const lease = open(f.leaseExpiry);
  if (lease) {
    const left = monthsBetween(ym(today), lease);
    if (left <= 12) {
      risks.push({
        title: `임대차 만료 ${left > 0 ? `${left}개월 남음` : '도래'}`,
        level: left <= 6 ? 'high' : 'medium',
        why: `임대차 만료가 ${lease}이라 인수 직후 갱신 협의가 필요합니다. 갱신 조건에 따라 월 고정비가 달라질 수 있습니다.`,
        question_to_seller: '임대인과 갱신 의사나 임대료 조정에 대해 이야기해 보셨나요?',
      });
      checklist.push('임대차계약서와 임대인 갱신 의사');
    }
  }

  const equipment = open(f.equipment) ?? [];
  const old = equipment.filter((e) => today.getFullYear() - e.year >= 5 || e.repairs?.length);
  if (old.length) {
    risks.push({
      title: '노후·수리 이력 장비',
      level: 'low',
      why: `다음 장비는 교체나 수리 비용이 생길 수 있습니다: ${old.map((e) => `${e.name}(${e.year}${e.repairs?.length ? `, 수리 ${e.repairs.length}회` : ''})`).join(', ')}.`,
      question_to_seller: `${old[0].name} 최근 점검·수리 내역을 보여주실 수 있나요?`,
    });
    checklist.push(`장비 작동 상태 확인 (${old.map((e) => e.name).join(', ')})`);
  }

  const franchise = open(f.franchiseTerms);
  if (franchise?.startsWith('프랜차이즈')) {
    risks.push({
      title: '가맹 조건 승계',
      level: 'medium',
      why: `${franchise}. 가맹본부의 양도 승인과 승계 조건 확인이 필요합니다.`,
      question_to_seller: '가맹본부에 양도 승인 절차와 비용을 확인해 보셨나요?',
    });
    checklist.push('가맹계약서와 양도 승인 조건');
  }

  if (financialLocked) checklist.push('재무·운영 정보 (구독 후 확인 가능)');
  else checklist.push('최근 12개월 카드사 정산 내역 원본');

  const valuation = open(f.valuation);
  const ask = open(f.premiumAsk)?.value ?? 0;   // 공개 필드라 항상 열려 있다
  const valueOpinion = valuation
    ? `코드가 계산한 권리금 추정 범위는 ${formatKRWRange(valuation.premiumLow, valuation.premiumHigh)}이며, 희망 권리금 ${formatKRW(ask)}은 ${ask < valuation.premiumLow ? '범위보다 낮습니다' : ask > valuation.premiumHigh ? '범위보다 높습니다' : '범위 안에 있습니다'}.${anomalies.some((a) => a.severity === 'high') ? ' 확인이 필요한 매출이 증빙되지 않으면 추정 범위가 낮아질 수 있습니다.' : ''}`
    : `희망 권리금은 ${formatKRW(ask)}입니다. 권리금 추정 범위는 구독 후 확인 가능합니다.`;

  const overallLevel = maxLevel(risks.map((r) => r.level));
  const highTitles = risks.filter((r) => r.level === 'high').map((r) => r.title);
  return {
    overall: {
      // 재무를 못 본 상태의 '위험 없음'은 판단 불가라서 보수적으로 medium
      level: financialLocked ? maxLevel([overallLevel, 'medium']) : risks.length ? overallLevel : 'low',
      one_liner: financialLocked
        ? '공개 정보만으로 본 결과입니다. 구독하면 매출·이익과 확인이 필요한 항목까지 볼 수 있습니다.'
        : highTitles.length
          ? `실사에서 꼭 확인해야 할 항목이 있습니다: ${highTitles.join(', ')}.`
          : risks.length ? '큰 위험 신호는 없지만 아래 항목은 실사에서 확인해 보세요.' : '눈에 띄는 위험 신호가 없습니다.',
    },
    risks: risks.sort((a, b) => RANK[b.level] - RANK[a.level]),
    value_opinion: valueOpinion,
    due_diligence_checklist: [...new Set(checklist)],
  };
}

// DEMO_MODE 에서는 코드 폴백 (viewer 마다 볼 수 있는 정보가 달라 녹화본 하나로는 잠긴 정보가 새어 나간다)
export async function generateRiskReport(view: ListingView): Promise<BuyerRiskReport> {
  const fallback = fallbackRiskReport(view);
  const report = await chatJson({
    system: RISK_SYSTEM, user: riskUserPrompt(view), schema: buyerRiskReportSchema,
    fixture: fallback, thinking: true, maxTokens: 4000, timeoutMs: 30_000,
  }).catch(() => fallback);
  // 재무를 못 본 상태의 '위험 낮음'은 판단 불가라서 최소 medium (폴백과 같은 규칙)
  if (isLocked(view.fields.riskFactors) && report.overall.level === 'low') report.overall.level = 'medium';
  return report;
}
