'use client';
// 월별 매출·영업이익 추이 (소유: B). 확인 필요한 달은 주황 막대 + 툴팁 사유. 색은 DESIGN.md §3-3
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatKRW } from '@/lib/format';
import type { MonthlyMetric } from '@/lib/types';

const BAR = '#CBD5E1';
const FLAGGED = '#FBBF24';
const PROFIT = '#1E293B';

export function RevenueChart({ months }: { months: MonthlyMetric[] }) {
  const data = months.map((m) => ({
    month: m.month.slice(2).replace('-', '.'),
    revenue: m.revenue.value,
    profit: m.operatingProfit.value,
    flagged: m.revenue.provenance === 'needs_check',
    note: m.revenue.note,
  }));

  return (
    <figure>
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={56}
              tickFormatter={(v: number) => `${Math.round(v / 10_000).toLocaleString('ko-KR')}만`}
            />
            <Tooltip
              formatter={(v, name) => [formatKRW(Number(v)), name === 'revenue' ? '매출' : '영업이익']}
              labelFormatter={(label, payload) => {
                const note = payload?.[0]?.payload?.note;
                return note ? `${label} · 확인 필요: ${note}` : label;
              }}
            />
            <Bar dataKey="revenue" radius={0} maxBarSize={28} isAnimationActive={false}>
              {data.map((d) => <Cell key={d.month} fill={d.flagged ? FLAGGED : BAR} />)}
            </Bar>
            <Line dataKey="profit" stroke={PROFIT} strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><i aria-hidden className="size-2.5" style={{ background: BAR }} />매출</span>
        <span className="inline-flex items-center gap-1.5"><i aria-hidden className="size-2.5" style={{ background: FLAGGED }} />확인이 필요한 달</span>
        <span className="inline-flex items-center gap-1.5"><i aria-hidden className="h-0.5 w-3" style={{ background: PROFIT }} />영업이익</span>
      </figcaption>
    </figure>
  );
}
