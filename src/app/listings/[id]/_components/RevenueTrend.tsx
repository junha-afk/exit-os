'use client';
// 월별 매출·영업이익 추이 (소유: A). 확인 필요한 달은 주황으로 표시한다.
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatKRW } from '@/lib/format';
import type { MonthlyMetric } from '@/lib/types';

export function RevenueTrend({ months }: { months: MonthlyMetric[] }) {
  const data = months.map((m) => ({
    month: m.month.slice(2).replace('-', '.'),
    revenue: m.revenue.value,
    profit: m.operatingProfit.value,
    flagged: m.revenue.provenance === 'needs_check',
    note: m.revenue.note,
  }));

  return (
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
              return note ? `${label} · ${note}` : label;
            }}
          />
          <Bar dataKey="revenue" radius={0} maxBarSize={28} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.month} fill={d.flagged ? '#fbbf24' : '#cbd5e1'} />
            ))}
          </Bar>
          <Line dataKey="profit" stroke="#1e293b" strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
