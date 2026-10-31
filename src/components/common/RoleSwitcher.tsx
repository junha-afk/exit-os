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
export const ROLE_LABEL: Record<Viewer, string> = Object.fromEntries(ROLES.map((r) => [r.value, r.label])) as Record<Viewer, string>;

export function RoleSwitcher({
  current,
  className,
  vertical,
}: {
  current: Viewer;
  className?: string;
  /** 메뉴 안에 넣을 때 세로 목록으로 */
  vertical?: boolean;
}) {
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
      className={cn(vertical ? 'flex flex-col' : 'inline-flex flex-wrap gap-1 border bg-muted p-1', className)}
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
              'whitespace-nowrap px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
              vertical ? 'flex min-h-11 items-center justify-between text-left' : 'min-h-9',
              vertical
                ? active ? 'bg-accent font-semibold text-accent-foreground' : 'hover:bg-muted'
                : active ? 'bg-background font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {r.label}
            {vertical && active && <span aria-hidden>✓</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 화면에서 역할을 고르지 않고, 사용자의 행동(구독·열람 승인·해지)으로 쿠키 상태를 바꾼다.
 * 인증이 붙으면 이 훅 대신 서버의 구독·승인 상태를 쓴다.
 */
export function useMembership() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const set = (role: Viewer) => {
    document.cookie = `${DEMO_ROLE_COOKIE}=${role}; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
    startTransition(() => router.refresh());
  };
  return { pending, set };
}
