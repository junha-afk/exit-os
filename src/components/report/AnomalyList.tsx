// 확인이 필요한 항목 목록 (소유: B). 사실 문장(detail)은 코드가, 확인 방법은 설명 함수가 만든다
import { AlertTriangle } from 'lucide-react';
import type { Anomaly } from '@/lib/types';
import { cn } from '@/lib/utils';

const KIND_LABEL: Record<Anomaly['kind'], string> = {
  cash_ratio: '현금 매출 비중', revenue_spike: '매출 급증', revenue_drop: '매출 급감',
  settlement_mismatch: '카드 정산 불일치', cogs_ratio: '매입 대비 매출', missing: '자료 누락',
};
const SEVERITY: Record<Anomaly['severity'], { label: string; className: string }> = {
  high: { label: '높음', className: 'bg-red-50 text-red-800 ring-red-200' },
  medium: { label: '보통', className: 'bg-amber-50 text-amber-900 ring-amber-200' },
  low: { label: '낮음', className: 'bg-slate-50 text-slate-700 ring-slate-200' },
};
const ORDER: Record<Anomaly['severity'], number> = { high: 0, medium: 1, low: 2 };

export function AnomalyList({ anomalies }: { anomalies: Anomaly[] }) {
  if (!anomalies.length) {
    return <p className="border-y py-4 text-sm text-muted-foreground">확인이 필요한 항목이 없어요.</p>;
  }
  const sorted = [...anomalies].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  return (
    <ul className="divide-y border-y">
      {sorted.map((a, i) => (
        <li key={`${a.month}-${a.kind}-${i}`} className="flex gap-3 py-4">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              {a.month && <span className="tabular-nums">{a.month}</span>}
              {KIND_LABEL[a.kind]}
              <span className={cn('px-1.5 py-0.5 text-xs font-medium ring-1', SEVERITY[a.severity].className)}>
                중요도 {SEVERITY[a.severity].label}
              </span>
            </p>
            <p className="mt-1 text-sm tabular-nums">{a.detail}</p>
            {a.aiExplanation && <p className="mt-1 text-sm text-muted-foreground">{a.aiExplanation}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
