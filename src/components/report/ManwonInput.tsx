'use client';
// 만원 단위 금액 칸 (소유: B). 화면은 만원, 값은 원으로 주고받는다
import { useId } from 'react';
import { cn } from '@/lib/utils';

const MAN = 10_000;

export function ManwonInput({
  label, value, onChange, hint, className,
}: {
  label: string;
  value: number;                 // 원
  onChange: (won: number) => void;
  hint?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="text-xs text-muted-foreground">{label}</label>
      <div className="mt-1 flex h-11 items-center border bg-background focus-within:outline-2 focus-within:outline-ring">
        <input
          id={id}
          inputMode="numeric"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-right text-[15px] tabular-nums outline-none"
          value={Math.round(value / MAN).toLocaleString('ko-KR')}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d]/g, '');
            onChange(digits ? Number(digits) * MAN : 0);
          }}
        />
        <span className={cn('pr-3 text-sm text-muted-foreground')}>만원</span>
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
