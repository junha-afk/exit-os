// 모바일 하단 탭바 (소유: A). md 이상에서는 숨기고 머리글 메뉴를 쓴다.
import Link from 'next/link';
import { ClipboardList, Heart, Store, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavKey } from './SiteHeader';
import { ROUTES } from './routes';

const TABS: { key: NavKey | 'saved'; label: string; href: string; Icon: typeof Store }[] = [
  { key: 'listings', label: '매물', href: '/', Icon: Store },
  { key: 'saved', label: '관심', href: '/', Icon: Heart },
  { key: 'sell', label: '내 가게 팔기', href: ROUTES.sell, Icon: Tag },
  { key: 'handover', label: '인수인계', href: ROUTES.handover, Icon: ClipboardList },
];

export function MobileTabBar({ active }: { active?: NavKey }) {
  return (
    <nav aria-label="하단 메뉴" className="fixed inset-x-0 bottom-0 z-20 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid grid-cols-4">
        {TABS.map(({ key, label, href, Icon }) => {
          const on = key === active;
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={on ? 'page' : undefined}
                className={cn('flex h-14 flex-col items-center justify-center gap-0.5 text-[11px]', on ? 'font-semibold text-primary' : 'text-muted-foreground')}
              >
                <Icon aria-hidden className="size-5" strokeWidth={on ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
