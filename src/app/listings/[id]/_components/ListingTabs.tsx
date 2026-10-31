'use client';
// 매물 상세 탭 (소유: A). 탭을 누르면 그 섹션만 보여준다. 주소 #해시로 바로 열 수 있다.
import { Lock } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ListingTab { id: string; label: string; locked?: boolean; content: ReactNode }

export function ListingTabs({ tabs }: { tabs: ListingTab[] }) {
  const [active, setActive] = useState(tabs[0].id);

  useEffect(() => {
    const sync = () => {
      const fromHash = window.location.hash.slice(1);
      if (tabs.some((t) => t.id === fromHash)) setActive(fromHash);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [tabs]);

  function select(id: string) {
    setActive(id);
    history.replaceState(null, '', `#${id}`);
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 폴더 탭: 선택된 탭만 흰 바탕에 아래 테두리가 열린다 */}
      <div role="tablist" aria-label="매물 정보" className="sticky top-0 z-10 flex overflow-x-auto bg-background">
        {tabs.map((t, i) => {
          const on = active === t.id;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`panel-${t.id}`}
              onClick={() => select(t.id)}
              className={cn(
                'h-14 min-w-28 flex-1 whitespace-nowrap border border-border px-4 text-[15px] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                i > 0 && '-ml-px',
                on
                  ? 'border-b-transparent bg-background font-bold text-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
              {t.locked && <Lock aria-label="잠김" className="ml-1 inline size-3.5 -translate-y-px opacity-50" />}
            </button>
          );
        })}
      </div>
      {/* 숨긴 탭은 아예 그리지 않는다 (차트가 0px 크기로 그려지는 문제 방지) */}
      {tabs
        .filter((t) => t.id === active)
        .map((t) => (
          <div key={t.id} id={`panel-${t.id}`} role="tabpanel" aria-labelledby={`tab-${t.id}`}>
            {t.content}
          </div>
        ))}
    </div>
  );
}
