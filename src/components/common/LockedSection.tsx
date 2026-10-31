// 잠긴 섹션 (소유: A). 서버가 내려준 Locked 를 그린다.
import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Locked } from '@/lib/types';
import { cn } from '@/lib/utils';

// public 이 잠기는 경우는 없지만 C의 Locked 타입이 허용하므로 구독 문구로 받는다
const COPY: Record<Locked['level'], { title: string; cta: string }> = {
  public: { title: '구독하면 볼 수 있어요', cta: '구독하고 열람하기' },
  subscriber: { title: '구독하면 볼 수 있어요', cta: '구독하고 열람하기' },
  approved: { title: '판매자 승인 후 공개돼요', cta: '열람 승인 요청하기' },
};

/**
 * 서버가 `{ locked: true, level }`로 내려준 섹션을 그린다(SKILL.md §1-2).
 * 실제 값은 받지 않으므로 children에는 모양만 비슷한 자리표시자를 넣는다.
 */
export function LockedSection({
  level,
  itemCount,
  children,
  onUnlock,
  className,
}: {
  level: Locked['level'];
  /** 잠긴 항목 수 — '구독하면 볼 수 있는 항목 N개' */
  itemCount?: number;
  /** 블러 처리될 자리표시자 */
  children?: ReactNode;
  onUnlock?: () => void;
  className?: string;
}) {
  const copy = COPY[level];
  return (
    <div className={cn('relative overflow-hidden border', className)}>
      <div aria-hidden className="pointer-events-none select-none blur-sm">
        {children ?? <PlaceholderRows />}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60 p-4 text-center">
        <span className="flex size-9 items-center justify-center rounded-full bg-foreground text-background">
          <Lock aria-hidden className="size-4" />
        </span>
        <p className="text-sm font-semibold">{copy.title}</p>
        {itemCount !== undefined && (
          <p className="text-xs text-muted-foreground">잠긴 항목 {itemCount}개</p>
        )}
        {onUnlock && (
          <button
            type="button"
            onClick={onUnlock}
            className="mt-1 min-h-11 bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {copy.cta}
          </button>
        )}
      </div>
    </div>
  );
}

function PlaceholderRows() {
  return (
    <div className="space-y-3 p-5">
      {[72, 56, 64, 40].map((w) => (
        <div key={w} className="flex items-center justify-between gap-4">
          <div className="h-3 bg-muted" style={{ width: `${w / 2}%` }} />
          <div className="h-5 w-24 bg-muted" />
        </div>
      ))}
    </div>
  );
}
