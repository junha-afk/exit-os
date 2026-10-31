// 매각 보고서 문장 (소유: B). docs/AI_PROMPTS.md §4. 숫자는 AnalysisResult 확정값만 인용한다
import { z } from 'zod';
import { formatKRW, formatPercent } from '@/lib/format';
import type { AnalysisResult, StoreFacts } from '@/lib/types';
import {
  factsView, franchiseText, handoverSupportText, monthsBetween, neighborhood, openDaysText, openHoursText, staffTotal,
} from '../facts';
import type { SellerReport } from '../types';
import { EVIDENCE } from './anomaly';

export const sellerReportSchema: z.ZodType<SellerReport> = z.object({
  headline: z.string().min(1).max(40),
  summary: z.string().min(1).max(600),
  sections: z.object({
    pnl: z.string().min(1), assets: z.string().min(1), operations: z.string().min(1), contracts: z.string().min(1),
    risks: z.array(z.string().min(1)).max(8), strengths: z.array(z.string().min(1)).max(8),
  }),
  seller_todo: z.array(z.string().min(1)).max(8),
});

export const SELLER_REPORT_SYSTEM = [
  '당신은 소상공인 매장 매각 보고서를 쓰는 보조자입니다.',
  '입력의 analysis 는 코드가 계산한 확정 숫자입니다. 숫자를 바꾸거나 새로 계산하거나 새 숫자를 만들지 마세요. 금액은 입력의 *_text 표기를 그대로 쓰세요.',
  '강점은 출처가 verified 인 수치 위주로 쓰고, 위험은 needs_check 항목과 운영 의존도에서 도출하세요.',
  'seller_todo 는 "확인 필요"를 "증빙 확인"으로 바꾸는 구체적 행동으로 쓰세요.',
  '법률 판단("불법", "무효")이나 가공 매출 단정은 금지합니다. "확인이 필요한 항목"으로 표현하세요.',
  'headline 은 30자 이내 한 줄 매력 포인트, summary 는 3문장. headline·summary 는 판매 페이지 매장 소개로도 쓰입니다.',
  '존댓말, 한국어. JSON 만 출력.',
].join('\n');

export function sellerReportUserPrompt(analysis: AnalysisResult, facts: StoreFacts): string {
  const v = factsView(facts);
  return JSON.stringify({
    analysis: {
      avg_revenue_text: formatKRW(analysis.avgRevenue.value), avg_revenue_provenance: analysis.avgRevenue.provenance,
      avg_operating_profit_text: formatKRW(analysis.avgOperatingProfit.value),
      margin_text: formatPercent(analysis.margin),
      adjusted_monthly_profit_text: formatKRW(analysis.valuation.adjustedMonthlyProfit),
      dedupe_count: analysis.dedupeCount,
      months: analysis.months.map((m) => ({ month: m.month, revenue_text: formatKRW(m.revenue.value), provenance: m.revenue.provenance, note: m.revenue.note })),
      anomalies: analysis.anomalies.map((a) => ({ month: a.month, kind: a.kind, severity: a.severity, detail: a.detail })),
      missing: analysis.missing,
      scores: analysis.scores,
      valuation_range_text: `${formatKRW(analysis.valuation.premiumLow)} ~ ${formatKRW(analysis.valuation.premiumHigh)}`,
      facility_value_text: formatKRW(analysis.valuation.facilityValue),
    },
    store: {
      industry: v.industry, region: v.region, opened_at: v.openedAt, sale_reason: v.saleReason,
      open_days: openDaysText(v.openDays), open_hours: openHoursText(v.openHours),
      owner_weekly_hours: v.ownerWeeklyHours, owner_tasks: v.ownerTasks, staff_roles: v.staffRoles,
      equipment: v.equipment.map(({ name, qty, year, condition, repairs }) => ({ name, qty, year, condition, repairs })),
      deposit_text: v.deposit !== undefined ? formatKRW(v.deposit) : null,
      monthly_rent_text: v.monthlyRent !== undefined ? formatKRW(v.monthlyRent) : null,
      lease_expiry: v.leaseExpiry, renewal_needed: v.renewalNeeded, franchise: franchiseText(v.franchiseTerms),
      handover: handoverSupportText(v),
    },
  });
}

// LLM 실패·미연결 시 폴백: 코드가 숫자와 facts 로 문장을 만든다 (숫자는 전부 analysis 값 그대로)
export function fallbackSellerReport(analysis: AnalysisResult, facts: StoreFacts): SellerReport {
  const v = factsView(facts);
  const lastMonth = analysis.months.at(-1)?.month ?? '';
  const years = v.openedAt && lastMonth ? Math.floor(monthsBetween(v.openedAt, lastMonth) / 12) : 0;
  const place = [neighborhood(v.region), v.industry].filter(Boolean).join(' ');
  const verifiedCard = analysis.months.filter((m) => m.posCard > 0 && !analysis.anomalies.some((a) => a.kind === 'settlement_mismatch' && a.month === m.month)).length;
  const flagged = analysis.months.filter((m) => m.revenue.provenance === 'needs_check').map((m) => m.month);

  const risks = analysis.anomalies.filter((a) => a.kind !== 'missing').map((a) => a.detail);
  if (analysis.missing.length) risks.push(`자료 누락: ${analysis.missing.join(', ')}`);
  if (analysis.scores.ownerDependency >= 70) {
    risks.push(`점주 의존도가 ${analysis.scores.ownerDependency}점으로 높습니다${v.ownerTasks.length ? ` (점주 전담: ${v.ownerTasks.join('·')})` : ''}.`);
  }

  const strengths: string[] = [];
  if (verifiedCard) strengths.push(`카드매출은 ${analysis.months.length}개월 중 ${verifiedCard}개월이 카드사 정산과 일치합니다.`);
  if (analysis.months.some((m) => m.delivery > 0)) strengths.push('배달 매출은 플랫폼 정산서로 확인됩니다.');
  if (analysis.scores.revenueStability >= 60) strengths.push(`매출 안정성 점수가 ${analysis.scores.revenueStability}점입니다.`);
  if (v.handoverSupport) strengths.push(`${handoverSupportText(v)}을 제공합니다.`);

  const todo = [...new Set(analysis.anomalies.map((a) => `${a.month ? `${a.month} ` : ''}증빙 올리기: ${EVIDENCE[a.kind]}`))];
  if (v.ownerTasks.length) todo.push(`${v.ownerTasks.join('·')} 업무를 매뉴얼로 정리하면 운영 의존도를 낮출 수 있습니다.`);

  const equipmentText = v.equipment.length
    ? `${v.equipment.map((e) => `${e.name}${e.qty > 1 ? ` ${e.qty}대` : ''}(${e.year})`).join(', ')} 등 장비 ${v.equipment.length}종입니다. `
    : '';

  return {
    headline: `${place}, 월평균 영업이익 ${formatKRW(analysis.avgOperatingProfit.value)}`.slice(0, 40),
    summary: [
      `${place ? `${place}로, ` : ''}최근 ${analysis.months.length}개월 월평균 매출은 ${formatKRW(analysis.avgRevenue.value)}, 월평균 영업이익은 ${formatKRW(analysis.avgOperatingProfit.value)}입니다.`,
      years ? `${years}년째 운영 중이며 ${v.saleReason ? `매각 사유는 ${v.saleReason}입니다.` : '매각을 준비하고 있습니다.'}` : '매각을 준비하고 있습니다.',
      flagged.length ? `${flagged.join(', ')} 자료는 확인이 필요해, 보완하면 가치 추정의 신뢰도가 높아집니다.` : '모든 달의 자료가 확인되었습니다.',
    ].join(' '),
    sections: {
      pnl: `월평균 매출 ${formatKRW(analysis.avgRevenue.value)}, 월평균 영업이익 ${formatKRW(analysis.avgOperatingProfit.value)}(이익률 ${formatPercent(analysis.margin)})입니다. 점주 근무시간을 반영한 조정 영업이익은 월 ${formatKRW(analysis.valuation.adjustedMonthlyProfit)}입니다.${analysis.dedupeCount ? ` POS와 중복된 배달 매출 ${analysis.dedupeCount}건을 제외하고 계산했습니다.` : ''}`,
      assets: `${equipmentText}내용연수 5년 정액법 기준 잔존가치는 ${formatKRW(analysis.valuation.facilityValue)}으로 추정됩니다.`,
      operations: [
        v.openDays.length ? `${openDaysText(v.openDays)} ${openHoursText(v.openHours)} 영업합니다.` : '',
        v.staffRoles.length ? `직원은 ${v.staffRoles.map((r) => `${r.role} ${r.count}명`).join(', ')}으로 총 ${staffTotal(v.staffRoles)}명입니다.` : '',
        v.ownerWeeklyHours ? `점주가 주 ${v.ownerWeeklyHours}시간 근무합니다.` : '',
      ].filter(Boolean).join(' ') || '운영 정보가 아직 없습니다.',
      contracts: [
        v.deposit !== undefined ? `임대보증금 ${formatKRW(v.deposit)}` : '',
        v.monthlyRent !== undefined ? `월 임대료 ${formatKRW(v.monthlyRent)}` : '',
        v.maintenanceFee !== undefined ? `관리비 ${formatKRW(v.maintenanceFee)}` : '',
      ].filter(Boolean).join(', ').concat(v.leaseExpiry ? `. 임대차 만료는 ${v.leaseExpiry}입니다${v.renewalNeeded ? ' (갱신 협의 필요)' : ''}.` : '.'),
      risks, strengths,
    },
    seller_todo: todo.slice(0, 8),
  };
}

// TODO(B-4): A의 chatJson(src/lib/ai/llm.ts, PR-0A) 머지 후 아래로 교체. fixture = src/lib/report/fixtures/report_seller.json
//   return chatJson({ system: SELLER_REPORT_SYSTEM, user: sellerReportUserPrompt(analysis, facts),
//     schema: sellerReportSchema, fixture }).catch(() => fallbackSellerReport(analysis, facts));
export async function generateSellerReport(analysis: AnalysisResult, facts: StoreFacts): Promise<SellerReport> {
  return fallbackSellerReport(analysis, facts);
}
