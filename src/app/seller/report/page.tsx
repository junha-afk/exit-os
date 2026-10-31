// 매각 준비 보고서 (소유: B). 분석·보고서는 서버에서 바로 만들고, 시뮬레이터·게시 폼만 클라이언트
// 머리글·단계 표시는 A의 seller/layout.tsx 가 그린다
import Link from 'next/link';
import { AiEstimateNotice, Metric } from '@/components/common';
import { ROUTES } from '@/components/common/routes';
import { AnomalyList } from '@/components/report/AnomalyList';
import { DealButton } from '@/components/report/DealButton';
import { PaybackSimulator } from '@/components/report/PaybackSimulator';
import { PaywallDialog } from '@/components/report/PaywallDialog';
import { PrintHeader, PrintPayback } from '@/components/report/PrintLayout';
import { PublishForm, type PublishDefaults } from '@/components/report/PublishForm';
import { RevenueChart } from '@/components/report/RevenueChart';
import { ScoreRow } from '@/components/report/ScoreRow';
import { ValuationRange } from '@/components/report/ValuationRange';
import { runAnalysis } from '@/lib/analysis/run';
import { getFacts } from '@/lib/facts/repo';
import { getListingByStore } from '@/lib/listing/repo';
import { MOCK_STORE_ID } from '@/lib/mocks';
import { factsView } from '@/lib/report/facts';
import { generateSellerReport } from '@/lib/report/prompts/seller';
import { getSellerReport, saveSellerReport } from '@/lib/report/repo';

export const dynamic = 'force-dynamic';

export default async function SellerReportPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const storeId = (await searchParams).store ?? MOCK_STORE_ID;
  const [analysis, facts] = await Promise.all([runAnalysis(storeId), getFacts(storeId)]);

  if (!analysis) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <h1 className="text-2xl font-bold tracking-tight">매각 준비 보고서</h1>
        <p className="mt-3 text-muted-foreground">
          보고서를 만들려면 POS 매출이나 배달앱 정산 자료가 필요해요. 진단 화면에서 재무 자료를 올려 주세요.
        </p>
        <Link href={ROUTES.sell} className="mt-6 inline-flex min-h-12 items-center bg-primary px-6 font-semibold text-primary-foreground">
          재무 자료 올리러 가기
        </Link>
      </main>
    );
  }

  let report = await getSellerReport(storeId);
  if (!report) {
    report = await generateSellerReport(analysis, facts);
    await saveSellerReport(storeId, report);
  }
  const v = factsView(facts);
  const listing = await getListingByStore(storeId);
  const profitProv = analysis.avgOperatingProfit.provenance;
  const flaggedCount = analysis.months.filter((m) => m.revenue.provenance === 'needs_check').length;

  const defaults: PublishDefaults = {
    premiumAsk: v.premiumAsk ?? listing?.detail.premiumAsk.value ?? 0,
    deposit: v.deposit ?? 0,
    monthlyRent: v.monthlyRent ?? 0,
    maintenanceFee: v.maintenanceFee ?? 0,
    estInitialCost: v.estInitialCost ?? 0,
    premiumBreakdown: listing?.detail.premiumBreakdown.value ?? { facility: 0, goodwill: 0, other: 0 },
    premiumBreakdownLevel: listing?.premiumBreakdownLevel ?? 'approved',
    intro: `${report.headline}. ${report.summary}`,
  };
  const simulator = (
    <PaybackSimulator
      valuation={analysis.valuation}
      defaultPremium={defaults.premiumAsk}
      defaultInitialCost={defaults.estInitialCost}
      deposit={v.deposit}
      profitProvenance={profitProv}
    />
  );

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 md:px-6 print:max-w-none print:p-0">
      <PrintHeader storeName={v.storeName} />
      <header className="border-b py-8">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm text-muted-foreground">{v.storeName} · 매각 준비 보고서</p>
          <PaywallDialog />
        </div>
        <h1 className="mt-2 text-xl font-bold tracking-tight md:text-[32px] md:leading-tight">{report.headline}</h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed">{report.summary}</p>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px] print:block">
        <div className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby="pnl-title">
            <h2 id="pnl-title" className="text-2xl font-bold">손익</h2>
            <div className="mt-4 grid grid-cols-2 gap-6 border-y py-5 sm:grid-cols-3">
              <Metric label="월평균 매출" sourced={analysis.avgRevenue} size="lg" />
              <Metric label="월평균 영업이익" sourced={analysis.avgOperatingProfit} size="lg" />
              <Metric label="이익률" value={analysis.margin} provenance={profitProv} format="percent" size="lg" />
            </div>
            {analysis.dedupeCount > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                POS와 겹친 배달 매출 <strong className="tabular-nums text-foreground">중복 제거됨 {analysis.dedupeCount}건</strong>을 빼고 계산했어요.
              </p>
            )}
            <p className="mt-3 text-[15px] leading-relaxed">{report.sections.pnl}</p>

            <h3 className="mt-8 text-sm font-semibold">최근 {analysis.months.length}개월 추이</h3>
            <div className="mt-3"><RevenueChart months={analysis.months} /></div>
          </section>

          <section aria-labelledby="check-title">
            <h2 id="check-title" className="text-2xl font-bold">
              확인이 필요한 항목 <span className="tabular-nums text-amber-700">{analysis.anomalies.length}</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {flaggedCount}개 달이 확인 필요로 표시됐어요. 증빙을 올리면 구매자에게 보이는 출처 라벨이 바뀌어요.
            </p>
            <div className="mt-4"><AnomalyList anomalies={analysis.anomalies} /></div>
          </section>

          <section aria-labelledby="score-title" className="print:break-inside-avoid">
            <h2 id="score-title" className="text-2xl font-bold">AI 점수</h2>
            <div className="mt-4"><ScoreRow scores={analysis.scores} /></div>
            <AiEstimateNotice className="mt-3" />
          </section>

          <section aria-labelledby="value-title" className="print:break-inside-avoid">
            <h2 id="value-title" className="text-2xl font-bold">매장 가치 추정</h2>
            <div className="mt-4 border-t pt-5">
              <ValuationRange valuation={analysis.valuation} premiumAsk={defaults.premiumAsk || undefined} profitProvenance={profitProv} />
            </div>
            {/* 모바일: 시뮬레이터를 가치 추정 바로 아래에 (데스크톱은 오른쪽 고정 패널) */}
            <div className="mt-8 border-t pt-6 lg:hidden print:hidden">{simulator}</div>
          </section>

          <PrintPayback valuation={analysis.valuation} premium={defaults.premiumAsk} initialCost={defaults.estInitialCost} />

          <section aria-labelledby="detail-title">
            <h2 id="detail-title" className="text-2xl font-bold">보고서</h2>
            <dl className="mt-4 divide-y border-y">
              {([['시설·자산', report.sections.assets], ['인력·운영', report.sections.operations], ['계약', report.sections.contracts]] as const).map(([title, body]) => (
                <div key={title} className="grid gap-1 py-4 sm:grid-cols-[120px_1fr]">
                  <dt className="text-sm font-semibold">{title}</dt>
                  <dd className="text-[15px] leading-relaxed">{body}</dd>
                </div>
              ))}
              <div className="grid gap-1 py-4 sm:grid-cols-[120px_1fr]">
                <dt className="text-sm font-semibold">강점</dt>
                <dd><ul className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed">{report.sections.strengths.map((s) => <li key={s}>{s}</li>)}</ul></dd>
              </div>
              <div className="grid gap-1 py-4 sm:grid-cols-[120px_1fr]">
                <dt className="text-sm font-semibold">위험 요인</dt>
                <dd><ul className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed">{report.sections.risks.map((s) => <li key={s}>{s}</li>)}</ul></dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="todo-title">
            <h2 id="todo-title" className="text-2xl font-bold">매각 전에 하면 좋은 일</h2>
            <ol className="mt-4 divide-y border-y">
              {report.seller_todo.map((t, i) => (
                <li key={t} className="flex gap-3 py-3 text-[15px]">
                  <span className="tabular-nums text-muted-foreground">{i + 1}</span>{t}
                </li>
              ))}
            </ol>
          </section>

          <section id="publish" className="border-t pt-10 print:hidden">
            <PublishForm storeId={storeId} defaults={defaults} publishedId={listing?.id} />
          </section>

          {listing && (
            <section aria-labelledby="deal-title" className="border-t pt-10 print:hidden">
              <h2 id="deal-title" className="text-2xl font-bold">구매자와 계약하기로 했나요?</h2>
              <p className="mt-1 mb-4 text-sm text-muted-foreground">
                거래를 시작하면 이 보고서의 장비·거래처·직원·계정 정보로 인수인계 업무를 자동으로 만들어요.
              </p>
              <DealButton listingId={listing.id} />
            </section>
          )}
        </div>

        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start print:hidden">{simulator}</aside>
      </div>
    </main>
  );
}
