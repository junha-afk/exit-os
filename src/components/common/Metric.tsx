// 출처 라벨이 붙은 숫자 (소유: A). provenance 없는 숫자는 못 그리게 타입으로 막는다.
import { formatKRW, formatMonths, formatPercent } from '@/lib/format';
import type { Provenance, Sourced } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ProvenanceBadge } from './ProvenanceBadge';

type MetricFormat = 'krw' | 'percent' | 'months' | 'number';

function formatValue(value: number, format: MetricFormat) {
  switch (format) {
    case 'krw':
      return formatKRW(value);
    case 'percent':
      return formatPercent(value);
    case 'months':
      return formatMonths(value);
    default:
      return value.toLocaleString('ko-KR');
  }
}

type MetricProps = {
  label: string;
  format?: MetricFormat;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
} & (
  | { sourced: Sourced<number>; value?: never; provenance?: never }
  | { value: number; provenance: Provenance; sourced?: never }
);

/**
 * 화면에 숫자를 그리는 유일한 방법(SKILL.md §1-1).
 * 출처 라벨 없이 숫자를 렌더링할 수 없도록 provenance를 필수로 받는다.
 */
export function Metric(props: MetricProps) {
  const { label, format = 'krw', hint, size = 'md', className } = props;
  const value = props.sourced ? props.sourced.value : props.value;
  const provenance = props.sourced ? props.sourced.provenance : props.provenance;
  const note = props.sourced?.note;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <ProvenanceBadge provenance={provenance} compact={size === 'sm'} />
      </div>
      <span
        className={cn(
          'font-semibold tabular-nums tracking-tight',
          size === 'sm' && 'text-base',
          size === 'md' && 'text-2xl',
          size === 'lg' && 'text-3xl',
        )}
      >
        {formatValue(value, format)}
      </span>
      {(hint || note) && <span className="text-xs text-muted-foreground">{note ?? hint}</span>}
    </div>
  );
}
