// 권리금 추정 범위 (소유: B). 범위 막대 위에 희망 권리금 위치를 표시한다. 옆에 AiEstimateNotice 필수
import { AiEstimateNotice, Metric } from '@/components/common';
import { formatKRW, formatKRWRange } from '@/lib/format';
import type { Provenance, Valuation } from '@/lib/types';

export function ValuationRange({
  valuation, premiumAsk, profitProvenance,
}: {
  valuation: Valuation;
  premiumAsk?: number;
  profitProvenance: Provenance;
}) {
  const { premiumLow: low, premiumHigh: high } = valuation;
  // 막대 양끝에 여유를 둬서 범위 밖 희망가도 표시한다
  const min = Math.min(low, premiumAsk ?? low) * 0.8;
  const max = Math.max(high, premiumAsk ?? high) * 1.1;
  const pos = (x: number) => `${((x - min) / (max - min)) * 100}%`;
  const position = premiumAsk === undefined ? null
    : premiumAsk < low ? '추정 범위보다 낮아요'
      : premiumAsk > high ? '추정 범위보다 높아요'
        : premiumAsk > low + (high - low) * 2 / 3 ? '추정 범위 안, 상단에 있어요' : '추정 범위 안에 있어요';

  return (
    <div>
      <p className="text-xs text-muted-foreground">권리금 추정 범위</p>
      <p className="mt-1 text-2xl font-bold tabular-nums lg:text-3xl">{formatKRWRange(low, high)}</p>

      <div className="relative mt-6 h-2 bg-muted" aria-hidden>
        <div className="absolute inset-y-0 bg-primary/30" style={{ left: pos(low), right: `calc(100% - ${pos(high)})` }} />
        {premiumAsk !== undefined && (
          <div className="absolute -top-2 h-6 w-0.5 bg-foreground" style={{ left: pos(premiumAsk) }} />
        )}
      </div>
      {premiumAsk !== undefined && (
        <p className="mt-3 text-sm">
          희망 권리금 <strong className="tabular-nums">{formatKRW(premiumAsk)}</strong>은 {position}.
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">영업권리금 (조정 영업이익 × 12~24개월)</dt>
          <dd className="mt-1 font-semibold tabular-nums">{formatKRWRange(valuation.goodwillLow, valuation.goodwillHigh)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">시설권리금 (장비 잔존가치)</dt>
          <dd className="mt-1 font-semibold tabular-nums">{formatKRW(valuation.facilityValue)}</dd>
        </div>
      </dl>
      <Metric
        className="mt-4"
        label="조정 영업이익 (점주 인건비 차감)"
        value={valuation.adjustedMonthlyProfit}
        provenance={profitProvenance}
        size="sm"
        hint="월 기준"
      />
      <AiEstimateNotice className="mt-4" />
    </div>
  );
}
