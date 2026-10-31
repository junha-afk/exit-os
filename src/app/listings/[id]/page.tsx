// 매물 판매 페이지 (소유: A). 공개 범위는 C의 filterListingForViewer 결과만 믿고 그린다.
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { CalendarClock, ImageIcon, Lock, MapPin, Store } from 'lucide-react';
import { AiEstimateNotice, LockedSection, Metric, ProvenanceBadge, RoleSwitcher } from '@/components/common';
import { formatKRW, formatKRWRange, formatMonths, formatPercent } from '@/lib/format';
import { mockListing, mockListings } from '@/lib/mocks';
import { isLocked, type Anomaly, type ListingField, type ListingView, type Locked, type Provenance, type Sourced } from '@/lib/types';
import { filterListingForViewer, getViewer } from '@/lib/visibility';
import { cn } from '@/lib/utils';
import { RevenueTrend } from './_components/RevenueTrend';
import { ListingTabs } from './_components/ListingTabs';
import { ViewerAction } from './_components/ViewerAction';

type Fields = ListingView['fields'];

// 보이는(잠기지 않은) Sourced 필드만 출처별로 센다
function countProvenance(fields: Fields): Record<Provenance, number> {
  const count: Record<Provenance, number> = { verified: 0, user_input: 0, needs_check: 0 };
  for (const v of Object.values(fields)) {
    if (v && typeof v === 'object' && !isLocked(v) && 'provenance' in v) count[(v as Sourced<unknown>).provenance]++;
  }
  return count;
}

// 섹션이 잠겼는지는 섹션에 속한 필드 중 하나라도 잠겼는지로 판단한다
function lockOf(fields: Fields, keys: ListingField[]): { lock: Locked | null; count: number } {
  const locked = keys.map((k) => fields[k]).filter(isLocked);
  return { lock: locked[0] ?? null, count: locked.length };
}

const ANOMALY_LABEL: Record<Anomaly['kind'], string> = {
  revenue_spike: '매출 급증',
  revenue_drop: '매출 급감',
  cash_ratio: '현금 비중 이상',
  settlement_mismatch: '정산 불일치',
  cogs_ratio: '원가율 이상',
  missing: '자료 누락',
};

const SEVERITY: Record<Anomaly['severity'], string> = {
  high: 'bg-red-50 text-red-800 ring-red-200',
  medium: 'bg-amber-50 text-amber-900 ring-amber-200',
  low: 'bg-slate-50 text-slate-700 ring-slate-200',
};

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== mockListing.id) notFound();

  const viewer = getViewer(new Request('http://local', { headers: await headers() }));
  const listing = filterListingForViewer(mockListing, viewer);
  const f = listing.fields;
  const d = mockListing.detail; // 공개 필드(문자열)만 여기서 읽는다

  const finance = lockOf(f, ['avgRevenue', 'avgOperatingProfit', 'margin', 'monthlyTrend']);
  const ops = lockOf(f, ['openDays', 'openHours', 'staffCount', 'ownerWeeklyHours', 'staffRoles', 'customerSegments', 'channelMix']);
  const assets = lockOf(f, ['equipment', 'inventoryIncluded', 'leaseExpiry', 'renewalNeeded', 'franchiseTerms']);
  const ai = lockOf(f, ['scores', 'riskFactors', 'paybackScenarios', 'valuation']);
  const handover = lockOf(f, ['handoverSupport', 'trainingWeeks', 'suppliers', 'digitalAccounts']);
  const trust = countProvenance(f);
  const similar = mockListings.filter((l) => l.id !== listing.id);

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <span className="text-sm font-bold tracking-tight">ExitOS</span>
          <RoleSwitcher current={viewer} />
        </div>
      </div>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* 히어로: 사진 + 핵심 숫자 4칸 (레퍼런스: Empire Flippers 상단 요약, 점포라인 손익 요약) */}
          <header className="overflow-hidden rounded-xl border bg-background">
            <div className="grid sm:grid-cols-[260px_1fr]">
              <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 sm:aspect-auto">
                <div className="text-center">
                  <ImageIcon aria-hidden className="mx-auto size-8" />
                  <p className="mt-2 text-xs">매장 사진 준비 중</p>
                </div>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Store aria-hidden className="size-4" />{d.industry}</span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1"><MapPin aria-hidden className="size-4" />{d.region}</span>
                  <span aria-hidden>·</span>
                  <span>{d.openedAt.replace('-', '년 ')}월 개업</span>
                </div>
                <h1 className="mt-2 text-3xl font-bold tracking-tight">{d.displayName}</h1>
                <p className="mt-2 leading-relaxed text-foreground/80">{d.intro}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 border-t sm:grid-cols-4">
              <KeyCell label="희망 권리금" value={isLocked(f.premiumAsk) ? null : formatKRW(f.premiumAsk.value)} lock={isLocked(f.premiumAsk) ? f.premiumAsk : null} />
              <KeyCell
                label="보증금 / 월세"
                value={isLocked(f.deposit) || isLocked(f.monthlyRent) ? null : `${formatKRW(f.deposit.value, { unit: false })} / ${formatKRW(f.monthlyRent.value)}`}
                lock={isLocked(f.deposit) ? f.deposit : null}
              />
              <KeyCell
                label="월평균 영업이익"
                value={isLocked(f.avgOperatingProfit) ? null : formatKRW(f.avgOperatingProfit.value)}
                lock={isLocked(f.avgOperatingProfit) ? f.avgOperatingProfit : null}
              />
              <KeyCell
                label="투자금 회수 (기준)"
                value={isLocked(f.paybackScenarios) ? null : formatMonths(f.paybackScenarios.find((s) => s.label === '기준')?.months ?? NaN)}
                lock={isLocked(f.paybackScenarios) ? f.paybackScenarios : null}
              />
            </dl>
            <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t px-6 py-4 text-sm">
              {!isLocked(f.areaM2) && <Fact label="면적" value={`${f.areaM2.value}㎡ (약 ${Math.round(f.areaM2.value / 3.3058)}평)`} />}
              {!isLocked(f.floor) && <Fact label="층" value={`${f.floor.value}층`} />}
              {!isLocked(f.seats) && <Fact label="좌석" value={`${f.seats.value}석`} />}
              <Fact label="매각 사유" value={d.saleReason} />
              <Fact label="희망 인계" value={d.desiredHandover.replace('-', '년 ') + '월'} />
            </dl>
          </header>

          <ListingTabs
            tabs={[

          // 매각 가격 (공개)
              { id: 'price', label: '매각 가격', content: (
          <Section id="price" title="매각 가격" level="public">
            <div className="grid gap-5 sm:grid-cols-3">
              {!isLocked(f.premiumAsk) && <Metric label="희망 권리금" sourced={f.premiumAsk} size="lg" />}
              {!isLocked(f.deposit) && <Metric label="보증금" sourced={f.deposit} />}
              {!isLocked(f.monthlyRent) && <Metric label="월세" sourced={f.monthlyRent} />}
              {!isLocked(f.maintenanceFee) && <Metric label="관리비" sourced={f.maintenanceFee} size="sm" />}
              {!isLocked(f.estInitialCost) && <Metric label="예상 초기비용" sourced={f.estInitialCost} size="sm" />}
            </div>
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold">권리금 구성</h3>
              {isLocked(f.premiumBreakdown) ? (
                <LockedSection level={f.premiumBreakdown.level} className="bg-background" />
              ) : (
                <PremiumBar breakdown={f.premiumBreakdown.value} provenance={f.premiumBreakdown.provenance} />
              )}
            </div>
          </Section>
              ) },

          // 재무 (구독)
              { id: 'finance', label: '재무', locked: !!finance.lock, content: (
          <Section id="finance" title="재무 정보" level="subscriber" lock={finance}>
            {!isLocked(f.avgRevenue) && !isLocked(f.avgOperatingProfit) && !isLocked(f.margin) && !isLocked(f.monthlyTrend) && (
              <>
                <div className="grid gap-5 sm:grid-cols-3">
                  <Metric label="월평균 매출" sourced={f.avgRevenue} size="lg" />
                  <Metric label="월평균 영업이익" sourced={f.avgOperatingProfit} size="lg" />
                  <Metric label="이익률" value={f.margin.value} provenance={f.margin.provenance} format="percent" size="lg" />
                </div>
                <div className="mt-6">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">최근 12개월 추이</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <Legend className="bg-slate-300" label="매출" />
                      <Legend className="bg-amber-400" label="확인 필요한 달" />
                      <Legend className="h-0.5 bg-slate-800" label="영업이익" />
                    </div>
                  </div>
                  <RevenueTrend months={f.monthlyTrend} />
                </div>
              </>
            )}
          </Section>
              ) },

          // 운영 (구독)
              { id: 'ops', label: '운영', locked: !!ops.lock, content: (
          <Section id="ops" title="운영 정보" level="subscriber" lock={ops}>
            {!isLocked(f.staffRoles) && !isLocked(f.staffCount) && !isLocked(f.ownerWeeklyHours) && (
              <>
                <div className="grid gap-5 sm:grid-cols-3">
                  <Metric label="직원 수 (명)" value={f.staffCount.value} provenance={f.staffCount.provenance} format="number" hint="점주 제외" />
                  <Metric label="점주 주간 근무 (시간)" sourced={f.ownerWeeklyHours} format="number" />
                  {!isLocked(f.openHours) && !isLocked(f.openDays) && <Fact label="영업" value={`${f.openDays} · ${f.openHours}`} />}
                </div>
                <table className="mt-6 w-full text-sm">
                  <caption className="sr-only">직원 구성</caption>
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr className="border-b"><th className="py-2 font-medium">역할</th><th className="font-medium">인원</th><th className="font-medium">주간 시간</th><th className="font-medium">담당</th></tr>
                  </thead>
                  <tbody>
                    {f.staffRoles.map((r) => (
                      <tr key={r.role} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{r.role}</td>
                        <td>{r.count}명</td>
                        <td className="tabular-nums">{r.weeklyHours ?? '-'}시간</td>
                        <td className="text-muted-foreground">{r.duties?.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  {!isLocked(f.customerSegments) && <Fact label="주요 고객" value={f.customerSegments} />}
                  {!isLocked(f.channelMix) && <Fact label="판매 채널" value={f.channelMix} />}
                </dl>
              </>
            )}
          </Section>
              ) },

          // 시설·계약 (구독)
              { id: 'assets', label: '시설 · 계약', locked: !!assets.lock, content: (
          <Section id="assets" title="시설 · 계약" level="subscriber" lock={assets}>
            {!isLocked(f.equipment) && !isLocked(f.leaseExpiry) && !isLocked(f.renewalNeeded) && (
              <>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {f.equipment.map((e) => (
                    <li key={e.name} className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm">
                      <div>
                        <p className="font-medium">{e.name} {e.qty > 1 && <span className="text-muted-foreground">×{e.qty}</span>}</p>
                        <p className="text-xs text-muted-foreground">{e.year}년식{e.repairs?.length ? ` · ${e.repairs.join(', ')}` : ''}</p>
                      </div>
                      <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-xs', e.condition === '양호' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700')}>
                        {e.condition}
                      </span>
                    </li>
                  ))}
                </ul>
                <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <Fact label="임대차 만료" value={f.leaseExpiry.replace('-', '년 ') + '월'} />
                  <Fact label="갱신 협의" value={f.renewalNeeded ? '필요' : '불필요'} warn={f.renewalNeeded} />
                  {!isLocked(f.franchiseTerms) && <Fact label="가맹" value={f.franchiseTerms} />}
                  {!isLocked(f.inventoryIncluded) && <Fact label="양도 포함" value={f.inventoryIncluded} />}
                </dl>
              </>
            )}
          </Section>
              ) },

          // AI 분석 (구독)
              { id: 'ai', label: 'AI 분석', locked: !!ai.lock, content: (
          <Section id="ai" title="AI 분석" level="subscriber" lock={ai}>
            {!isLocked(f.scores) && !isLocked(f.valuation) && !isLocked(f.paybackScenarios) && !isLocked(f.riskFactors) && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Score label="매출 안정성" value={f.scores.revenueStability} />
                  <Score label="자료 완성도" value={f.scores.dataCompleteness} />
                  <Score label="점주 의존도" value={f.scores.ownerDependency} inverse />
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">AI 추정 권리금 범위</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{formatKRWRange(f.valuation.premiumLow, f.valuation.premiumHigh)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {!isLocked(f.premiumAsk) &&
                      `희망 권리금 ${formatKRW(f.premiumAsk.value)}은 추정 범위${
                        f.premiumAsk.value > f.valuation.premiumHigh ? '보다 높아요' : f.premiumAsk.value < f.valuation.premiumLow ? '보다 낮아요' : ' 안에 있어요'
                      }. `}
                    점주 인건비를 빼면 월 이익은{' '}
                    {formatKRW(f.valuation.adjustedMonthlyProfit)}이에요.
                  </p>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold">투자금 회수 시나리오</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {f.paybackScenarios.map((s) => (
                      <div key={s.label} className={cn('rounded-lg border p-4', s.label === '기준' && 'border-foreground/40')}>
                        <p className="text-xs text-muted-foreground">{s.label} · 월 {formatKRW(s.monthlyProfit)}</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums">{formatMonths(s.months)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold">확인이 필요한 점 {f.riskFactors.length}건</h3>
                  <ul className="space-y-2">
                    {f.riskFactors.map((r, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-xs ring-1 ring-inset', SEVERITY[r.severity])}>{ANOMALY_LABEL[r.kind]}</span>
                        <span>{r.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <AiEstimateNotice />
              </div>
            )}
          </Section>
              ) },

          // 인수인계 (구독)
              { id: 'handover', label: '인수인계', locked: !!handover.lock, content: (
          <Section id="handover" title="인수인계 지원" level="subscriber" lock={handover}>
            {!isLocked(f.handoverSupport) && !isLocked(f.trainingWeeks) && !isLocked(f.suppliers) && !isLocked(f.digitalAccounts) && (
              <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
                <Metric label="현장 교육 (주)" value={f.trainingWeeks.value} provenance={f.trainingWeeks.provenance} format="number" hint={f.handoverSupport} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TagList title="거래처" items={f.suppliers.map((s) => `${s.name} · ${s.item}`)} />
                  <TagList title="이전할 계정" items={f.digitalAccounts.map((a) => a.platform)} />
                </div>
              </div>
            )}
          </Section>
              ) },
            ]}
          />

          {/* 하단: 자료 안내 + 비슷한 매물 (레퍼런스: BizBuySell 면책·유사 매물) */}
          <p className="rounded-lg border border-dashed px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            숫자는 판매자가 입력하거나 올린 자료에서 나왔어요. 매출 증빙과 대조된 숫자에만 &lsquo;증빙 확인&rsquo; 배지가 붙고, 맞지 않는 부분은
            &lsquo;확인 필요&rsquo;로 표시돼요. 권리금 계약 전 원본 자료를 꼭 확인하세요.
          </p>
          <section aria-labelledby="similar-title">
            <h2 id="similar-title" className="mb-3 text-lg font-semibold">비슷한 매물</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {similar.map((s) => (
                <li key={s.id} className="rounded-xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{s.industry} · {s.region}</p>
                  <p className="mt-1 font-semibold">{s.displayName}</p>
                  <p className="mt-2 text-sm">
                    권리금 <b className="tabular-nums">{formatKRW(s.premiumAsk.value)}</b>
                    <span className="text-muted-foreground"> · 보증금 {formatKRW(s.deposit.value, { unit: false })} / 월세 {formatKRW(s.monthlyRent.value)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* 오른쪽 고정 영역 */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-5 rounded-xl border bg-background p-5">
            <div>
              <p className="text-xs text-muted-foreground">희망 권리금</p>
              <p className="text-2xl font-bold tabular-nums">{!isLocked(f.premiumAsk) && formatKRW(f.premiumAsk.value)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                보증금 {!isLocked(f.deposit) && formatKRW(f.deposit.value)} · 월세 {!isLocked(f.monthlyRent) && formatKRW(f.monthlyRent.value)}
              </p>
            </div>
            <ViewerAction viewer={viewer} listingId={listing.id} />
            <div className="space-y-1.5 border-t pt-4 text-sm">
              <Row label="잠긴 항목 (구독)" value={`${listing.lockedCount.subscriber}개`} />
              <Row label="잠긴 항목 (승인)" value={`${listing.lockedCount.approved}개`} />
              <Row label="희망 인계" value={d.desiredHandover.replace('-', '년 ') + '월'} icon />
            </div>
            <div className="space-y-2 border-t pt-4">
              <p className="text-xs text-muted-foreground">지금 보이는 숫자의 출처</p>
              {(['verified', 'user_input', 'needs_check'] as const).map((p) => (
                <div key={p} className="flex items-center justify-between">
                  <ProvenanceBadge provenance={p} />
                  <span className="text-sm font-medium tabular-nums">{trust[p]}개</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Section({
  id,
  title,
  level,
  lock,
  children,
}: {
  id: string;
  title: string;
  level: 'public' | 'subscriber';
  lock?: { lock: Locked | null; count: number };
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 rounded-xl border bg-background p-6" aria-labelledby={`${id}-title`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id={`${id}-title`} className="text-lg font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">{level === 'public' ? '전체 공개' : '구독자 공개'}</span>
      </div>
      {lock?.lock ? <LockedSection level={lock.lock.level} itemCount={lock.count} /> : children}
    </section>
  );
}

function KeyCell({ label, value, lock }: { label: string; value: string | null; lock: Locked | null }) {
  return (
    <div className="border-r px-6 py-4 last:border-r-0 [&:nth-child(2)]:border-r-0 sm:[&:nth-child(2)]:border-r">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1">
        {lock ? (
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Lock aria-hidden className="size-3.5" />
            {lock.level === 'approved' ? '승인 후 공개' : '구독 후 공개'}
          </span>
        ) : (
          <span className="whitespace-nowrap text-base font-bold tabular-nums lg:text-lg">{value}</span>
        )}
      </dd>
    </div>
  );
}

function Fact({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('font-medium', warn && 'text-amber-700')}>{value}</dd>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        {icon && <CalendarClock aria-hidden className="size-3.5" />}
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn('inline-block h-2.5 w-2.5 rounded-sm', className)} />
      {label}
    </span>
  );
}

// 점수 0–100. inverse 면 높을수록 위험(점주 의존도)
function Score({ label, value, inverse }: { label: string; value: number; inverse?: boolean }) {
  const good = inverse ? value < 50 : value >= 70;
  const bad = inverse ? value >= 70 : value < 50;
  const tone = good ? 'bg-emerald-500' : bad ? 'bg-amber-500' : 'bg-slate-400';
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums">{value}</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${value}%` }} />
      </div>
      {inverse && <p className="mt-2 text-xs text-muted-foreground">높을수록 점주가 빠지면 흔들려요</p>}
    </div>
  );
}

function PremiumBar({ breakdown, provenance }: { breakdown: { facility: number; goodwill: number; other: number }; provenance: Parameters<typeof ProvenanceBadge>[0]['provenance'] }) {
  const total = breakdown.facility + breakdown.goodwill + breakdown.other;
  const parts = [
    { label: '시설', value: breakdown.facility, cls: 'bg-slate-700' },
    { label: '영업', value: breakdown.goodwill, cls: 'bg-slate-400' },
    { label: '기타', value: breakdown.other, cls: 'bg-slate-200' },
  ];
  return (
    <div className="space-y-3">
      <div className="flex h-3 overflow-hidden rounded-full">
        {parts.map((p) => <div key={p.label} className={p.cls} style={{ width: `${(p.value / total) * 100}%` }} />)}
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn('size-2.5 rounded-sm', p.cls)} />
            {p.label} <b className="tabular-nums">{formatKRW(p.value)}</b>
            <span className="text-muted-foreground">({formatPercent(p.value / total)})</span>
          </span>
        ))}
        <ProvenanceBadge provenance={provenance} />
      </div>
    </div>
  );
}

function TagList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">{title}</p>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((i) => <li key={i} className="rounded-md bg-muted px-2 py-1 text-sm">{i}</li>)}
      </ul>
    </div>
  );
}
