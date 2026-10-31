'use client';
// 시연용 역할 전환 (소유: A). 쿠키 이름은 C의 visibility.getViewer 와 같아야 한다.

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { Viewer } from '@/lib/types';
import { cn } from '@/lib/utils';

const ROLES: { value: Viewer; label: string }[] = [
  { value: 'seller', label: '판매자' },
  { value: 'buyer', label: '구매자' },
  { value: 'buyer_subscribed', label: '구매자 · 구독' },
  { value: 'buyer_approved', label: '구매자 · 승인' },
];

export const DEMO_ROLE_COOKIE = 'demo_role';

/**
 * 인증 대신 쓰는 시연용 역할 전환(TEAM_PLAN 결정 로그).
 * 쿠키 `demo_role`을 바꾸고 서버 컴포넌트를 다시 그려서, 공개 범위 필터가 서버에서 다시 적용되게 한다.
 */
export function RoleSwitcher({ current, className }: { current: Viewer; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function select(role: Viewer) {
    document.cookie = `${DEMO_ROLE_COOKIE}=${role}; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="radiogroup"
      aria-label="시연 역할 선택"
      aria-busy={pending}
      className={cn('inline-flex flex-wrap gap-1 border bg-muted p-1', className)}
    >
      {ROLES.map((r) => {
        const active = r.value === current;
        return (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => select(r.value)}
            className={cn(
              'min-h-9 whitespace-nowrap px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
              active ? 'bg-background font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
