'use client';
// 매물 상세 탭 (소유: A). 탭을 누르면 그 섹션만 보여준다. 주소 #해시로 바로 열 수 있다.
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
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="매물 정보" className="sticky top-0 z-10 flex overflow-x-auto rounded-lg border bg-background/95 p-1 backdrop-blur">
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => select(t.id)}
            className={cn(
              'min-h-10 flex-1 whitespace-nowrap rounded-md px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
              active === t.id ? 'bg-foreground font-semibold text-background' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            {t.locked && <span aria-label="잠김" className="ml-1 opacity-60">🔒</span>}
          </button>
        ))}
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
