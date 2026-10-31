'use client';
// 사이트 머리글 (소유: A). ☰ = 사이트 메뉴(왼쪽 서랍). 데스크톱: 로고·주 메뉴·검색·관심·내 정보 / 모바일: ☰·로고·검색·내 정보.
import Link from 'next/link';
import { ChevronDown, ChevronLeft, Heart, Menu, Search, Store, Tag, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Viewer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useMembership } from './RoleSwitcher';
import { ROUTES } from './routes';

export type NavKey = 'listings' | 'sell';

export const NAV: { key: NavKey; label: string; href: string }[] = [
  { key: 'listings', label: '매물 찾기', href: ROUTES.listings },
  { key: 'sell', label: '내 가게 팔기', href: ROUTES.sell },
];

export function SiteHeader({
  viewer,
  active,
  backHref,
  hideSearch,
  children,
}: {
  viewer: Viewer;
  active?: NavKey;
  /** 모바일에서 ☰ 대신 왼쪽에 뒤로 가기 */
  backHref?: string;
  /** 페이지 안에 검색이 따로 있으면 머리글 검색을 숨긴다 (매물 찾기) */
  hideSearch?: boolean;
  /** 머리글 아래 줄 (현재 조건 등) */
  children?: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 md:h-16 md:gap-5 md:px-6">
        <button
          type="button"
          aria-label="사이트 메뉴 열기"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
          className={cn('-ml-2 grid size-11 place-items-center', backHref && 'hidden md:grid')}
        >
          <Menu aria-hidden className="size-5" />
        </button>
        {backHref && (
          <Link href={backHref} aria-label="매물 목록으로" className="-ml-2 grid size-11 place-items-center md:hidden">
            <ChevronLeft aria-hidden className="size-5" />
          </Link>
        )}
        <Link href={ROUTES.home} className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-primary">
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

        <div className="ml-auto" />
        {!hideSearch && (
          <>
            <Link href={ROUTES.listings} className="hidden h-10 w-64 items-center gap-2 border bg-background px-3 text-sm text-muted-foreground lg:flex">
              <Search aria-hidden className="size-4" />
              동네나 역 이름
            </Link>
            <Link href={ROUTES.listings} aria-label="매물 검색" className="grid size-11 place-items-center lg:hidden">
              <Search aria-hidden className="size-5" />
            </Link>
          </>
        )}
        <Link href={ROUTES.listings} className="hidden items-center gap-1.5 px-2 text-sm text-muted-foreground hover:text-foreground md:flex">
          <Heart aria-hidden className="size-4" />
          관심 매물
        </Link>
        <AccountMenu viewer={viewer} />
      </div>
      {children}
      {/* 머리글의 backdrop-blur 가 fixed 기준을 가두므로 body 로 띄운다 */}
      {menuOpen && createPortal(<SiteMenu active={active} onClose={() => setMenuOpen(false)} />, document.body)}
    </header>
  );
}

const MENU_ICON: Record<NavKey, typeof Store> = { listings: Store, sell: Tag };

// ☰ 사이트 메뉴: 주 메뉴 + 관심 매물 + 안내
function SiteMenu({ active, onClose }: { active?: NavKey; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="사이트 메뉴">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <aside className="absolute inset-y-0 left-0 flex w-[min(320px,85vw)] flex-col bg-background">
        <div className="flex h-14 items-center justify-between border-b px-5 md:h-16">
          <span className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-primary">
            <span aria-hidden className="grid size-6 place-items-center bg-primary text-[13px] font-black text-primary-foreground">E</span>
            ExitOS
          </span>
          <button type="button" aria-label="닫기" onClick={onClose} className="-mr-2 grid size-11 place-items-center text-muted-foreground">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <nav aria-label="사이트 메뉴" className="flex-1 overflow-y-auto py-2">
          {NAV.map((n) => {
            const Icon = MENU_ICON[n.key];
            const on = active === n.key;
            return (
              <Link
                key={n.key}
                href={n.href}
                onClick={onClose}
                aria-current={on ? 'page' : undefined}
                className={cn('flex min-h-12 items-center gap-3 px-5 text-[15px]', on ? 'bg-accent font-bold text-accent-foreground' : 'hover:bg-muted')}
              >
                <Icon aria-hidden className="size-5" />
                {n.label}
              </Link>
            );
          })}
          <Link href={ROUTES.listings} onClick={onClose} className="flex min-h-12 items-center gap-3 px-5 text-[15px] hover:bg-muted">
            <Heart aria-hidden className="size-5" />
            관심 매물
          </Link>
          <div className="mx-5 my-3 border-t" />
          <p className="px-5 pb-1 text-xs font-medium text-muted-foreground">안내</p>
          {['출처 배지 보는 법', '권리금 이해하기', '고객센터'].map((label) => (
            <Link key={label} href={ROUTES.listings} onClick={onClose} className="flex min-h-11 items-center px-5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-4">
          <Link href={ROUTES.sell} onClick={onClose} className="flex h-12 items-center justify-center bg-primary text-sm font-semibold text-primary-foreground">
            내 가게 가치 진단 시작
          </Link>
        </div>
      </aside>
    </div>
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
            <MenuLink href={ROUTES.listings}>관심 매물</MenuLink>
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
