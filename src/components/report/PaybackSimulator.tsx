'use client';
// 희망 매각가 시뮬레이터 (소유: B). 권리금을 바꾸면 회수 기간이 즉시 바뀐다 — 계산은 클라이언트 결정론 로직(LLM 아님)
import { useState } from 'react';
import { AiEstimateNotice, Metric } from '@/components/common';
import { paybackScenarios } from '@/lib/analysis/payback';
import { formatKRW } from '@/lib/format';
import type { Provenance, Valuation } from '@/lib/types';
import { ManwonInput } from './ManwonInput';

const STEP = 5_000_000;

export function PaybackSimulator({
  valuation, defaultPremium, defaultInitialCost, deposit, profitProvenance,
}: {
  valuation: Valuation;
  defaultPremium: number;
  defaultInitialCost: number;
  deposit?: number;
  profitProvenance: Provenance;
}) {
  const [premium, setPremium] = useState(defaultPremium);
  const [initialCost, setInitialCost] = useState(defaultInitialCost);
  const sliderMax = Math.ceil((Math.max(valuation.premiumHigh, defaultPremium) * 1.5) / STEP) * STEP;
  const scenarios = paybackScenarios(premium, initialCost, valuation);

  return (
    <section aria-labelledby="simulator-title">
      <h3 id="simulator-title" className="text-sm font-semibold">투자금 회수 시뮬레이터</h3>
      <p className="mt-1 text-xs text-muted-foreground">희망 권리금을 바꾸면 구매자의 회수 기간이 바로 바뀌어요.</p>

      <ManwonInput className="mt-4" label="희망 권리금" value={premium} onChange={setPremium} />
      <input
        type="range"
        aria-label="희망 권리금 조절"
        min={0}
        max={sliderMax}
        step={STEP}
        value={Math.min(premium, sliderMax)}
        onChange={(e) => setPremium(Number(e.target.value))}
        className="mt-3 w-full accent-[var(--primary)]"
      />
      <ManwonInput className="mt-3" label="예상 초기 인수 비용" value={initialCost} onChange={setInitialCost} hint="재고·소모품·리뉴얼 등" />

      <ul className="mt-4 divide-y border-y">
        {scenarios.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-semibold">{s.label}</p>
              <p className="text-xs text-muted-foreground tabular-nums">월 영업이익 {formatKRW(s.monthlyProfit)}</p>
            </div>
            {Number.isFinite(s.months)
              ? <Metric label="회수 기간" value={s.months} provenance={profitProvenance} format="months" size="sm" />
              : <p className="text-sm text-amber-700">이익이 없어 회수할 수 없어요</p>}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        (희망 권리금 + 초기 비용) ÷ 월 영업이익.
        {deposit !== undefined && ` 보증금 ${formatKRW(deposit)}은 돌려받는 돈이라 따로 봐요.`}
      </p>
      <AiEstimateNotice className="mt-3" />
    </section>
  );
}
