// facts + 분석 + 보고서 + 게시 폼 → ListingDetail (소유: B). 순수 함수
import { paybackScenarios } from '@/lib/analysis/payback';
import type { AnalysisResult, ListingDetail, PremiumBreakdown, Sourced, StoreFacts } from '@/lib/types';
import {
  channelMixText, factsView, franchiseText, handoverSupportText, neighborhood, openDaysText, openHoursText, staffTotal,
} from '@/lib/report/facts';

// 점주가 게시 폼에서 확인·수정한 값 (금액은 원)
export interface PublishInput {
  premiumAsk: number;
  deposit: number;
  monthlyRent: number;
  maintenanceFee: number;
  estInitialCost: number;
  premiumBreakdown?: PremiumBreakdown;
  premiumBreakdownLevel: 'public' | 'approved';
  intro: string;
}

const ui = <T,>(value: T, note?: string): Sourced<T> => ({ value, provenance: 'user_input', ...(note && { note }) });

export function anonymousName(region: string, industry: string): string {
  return `${neighborhood(region)} ${industry} A`;
}

export function buildListingDetail(facts: StoreFacts, analysis: AnalysisResult, input: PublishInput): ListingDetail {
  const v = factsView(facts);
  return {
    displayName: v.isAnonymous ? anonymousName(v.region, v.industry) : v.storeName,
    industry: v.industry,
    region: v.region,
    openedAt: v.openedAt,
    intro: input.intro,
    photos: [],
    areaM2: ui(Number(facts.area_m2?.value ?? 0)),
    floor: ui(Number(facts.floor?.value ?? 0)),
    seats: ui(Number(facts.seats?.value ?? 0)),
    saleReason: v.saleReason,
    desiredHandover: v.desiredHandover,

    premiumAsk: ui(input.premiumAsk),
    deposit: ui(input.deposit),
    monthlyRent: ui(input.monthlyRent),
    maintenanceFee: ui(input.maintenanceFee),
    estInitialCost: ui(input.estInitialCost),
    premiumBreakdown: ui(input.premiumBreakdown ?? { facility: 0, goodwill: 0, other: 0 }),

    avgRevenue: analysis.avgRevenue,
    avgOperatingProfit: analysis.avgOperatingProfit,
    margin: { value: analysis.margin, provenance: analysis.avgOperatingProfit.provenance },
    monthlyTrend: analysis.months,

    openDays: openDaysText(v.openDays),
    openHours: openHoursText(v.openHours),
    staffCount: ui(staffTotal(v.staffRoles)),
    ownerWeeklyHours: ui(v.ownerWeeklyHours ?? 0, v.ownerTasks.length ? `${v.ownerTasks.join('·')} 점주 전담` : undefined),
    staffRoles: v.staffRoles,
    customerSegments: v.customerSegments.join(', '),
    channelMix: channelMixText(v.channelMix),

    equipment: v.equipment,
    inventoryIncluded: v.inventoryIncluded.join(', '),

    leaseExpiry: v.leaseExpiry,
    renewalNeeded: v.renewalNeeded === true,
    franchiseTerms: franchiseText(v.franchiseTerms),

    scores: analysis.scores,
    riskFactors: analysis.anomalies,
    paybackScenarios: paybackScenarios(input.premiumAsk, input.estInitialCost, analysis.valuation),
    valuation: analysis.valuation,

    handoverSupport: handoverSupportText(v),
    trainingWeeks: ui(v.trainingWeeks ?? 0),
    suppliers: v.suppliers,
    digitalAccounts: v.digitalAccounts,
  };
}
