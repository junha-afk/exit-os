'use client';
// 사이트 머리글 (소유: A). 데스크톱: 로고·주 메뉴·검색·관심·내 정보 / 모바일: 로고·검색·내 정보 (메뉴는 하단 탭바).
import Link from 'next/link';
import { ChevronDown, ChevronLeft, Heart, Menu, Search, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Viewer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useMembership } from './RoleSwitcher';
import { ROUTES } from './routes';

export type NavKey = 'listings' | 'sell' | 'handover';

export const NAV: { key: NavKey; label: string; href: string }[] = [
  { key: 'listings', label: '매물 찾기', href: ROUTES.listings },
  { key: 'sell', label: '내 가게 팔기', href: ROUTES.sell },
  { key: 'handover', label: '인수인계', href: ROUTES.handover },
];

export function SiteHeader({
  viewer,
  active,
  onMenuClick,
  backHref,
  children,
}: {
  viewer: Viewer;
  active?: NavKey;
  /** 있으면 왼쪽에 ☰ (매물 목록의 정렬·필터) */
  onMenuClick?: () => void;
  /** 모바일에서 왼쪽에 뒤로 가기 */
  backHref?: string;
  /** 머리글 아래 줄 (현재 조건 등) */
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 md:h-16 md:gap-6 md:px-6">
        {onMenuClick && (
          <button type="button" aria-label="정렬·필터 열기" onClick={onMenuClick} className="-ml-2 grid size-11 place-items-center">
            <Menu aria-hidden className="size-5" />
          </button>
        )}
        {backHref && (
          <Link href={backHref} aria-label="매물 목록으로" className="-ml-2 grid size-11 place-items-center md:hidden">
            <ChevronLeft aria-hidden className="size-5" />
          </Link>
        )}
        <Link href="/" className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-primary">
          <span aria-hidden className="grid size-6 place-items-center bg-primary text-[13px] font-black text-primary-foreground">E</span>
          ExitOS
        </Link>

        <nav aria-label="주 메뉴" className="ml-2 hidden h-full md:flex">
          {NAV.map((n) => (
            <Link
              key={n.key}
              href={n.href}
              aria-current={active === n.key ? 'page' : undefined}
              className={cn(
                'flex h-full items-center border-b-2 px-3 text-[15px] transition-colors',
                active === n.key ? 'border-primary font-bold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden h-10 w-64 items-center gap-2 border bg-background px-3 text-sm text-muted-foreground lg:flex">
          <Search aria-hidden className="size-4" />
          동네나 역 이름
        </div>
        <button type="button" aria-label="검색" className="ml-auto grid size-11 place-items-center lg:hidden">
          <Search aria-hidden className="size-5" />
        </button>
        <Link href="/" className="hidden items-center gap-1.5 px-2 text-sm text-muted-foreground hover:text-foreground md:flex">
          <Heart aria-hidden className="size-4" />
          관심 매물
        </Link>
        <AccountMenu viewer={viewer} />
      </div>
      {children}
    </header>
  );
}

function AccountMenu({ viewer }: { viewer: Viewer }) {
  const [open, setOpen] = useState(false);
  const { pending, set } = useMembership();
  const subscribed = viewer === 'buyer_subscribed' || viewer === 'buyer_approved';
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 items-center gap-2 pl-1 pr-1 text-sm md:border md:px-3"
      >
        <span aria-hidden className="grid size-7 place-items-center bg-accent text-accent-foreground">
          <UserRound className="size-4" />
        </span>
        <span className="hidden md:inline">내 정보</span>
        <ChevronDown aria-hidden className={cn('hidden size-4 transition-transform md:block', open && 'rotate-180')} />
      </button>

      {open && (
        <div role="menu" className="fixed inset-x-0 top-14 z-30 border-b bg-background shadow-lg md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 md:w-72 md:border">
          <div className="border-b px-4 py-4">
            <p className="font-semibold">김사장님</p>
            <p className="mt-0.5 text-sm text-muted-foreground">팔 때도, 살 때도 같은 계정이에요</p>
          </div>
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">매물 열람 구독</p>
              <p className={cn('mt-0.5 font-semibold', subscribed && 'text-primary')}>{subscribed ? '구독 중' : '구독 안 함'}</p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => set(subscribed ? 'buyer' : 'buyer_subscribed')}
              className={cn('h-9 shrink-0 px-3 text-sm font-medium disabled:opacity-60', subscribed ? 'border' : 'bg-primary text-primary-foreground')}
            >
              {subscribed ? '구독 해지' : '구독하기'}
            </button>
          </div>
          <div className="flex flex-col py-1 text-sm">
            <MenuLink href={ROUTES.sell}>내 가게 팔기 · 가치 진단</MenuLink>
            <MenuLink href="/">관심 매물</MenuLink>
            <MenuLink href={ROUTES.handover}>인수인계 진행 상황</MenuLink>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link role="menuitem" href={href} className="flex min-h-11 items-center px-4 hover:bg-muted">
      {children}
    </Link>
  );
}
