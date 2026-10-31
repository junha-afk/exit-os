// 판매자 공통 레이아웃 (소유: A). 사이트 머리글 + 진단 → 보고서 → 게시 단계 표시.
import { headers } from 'next/headers';
import { MobileTabBar, SiteFooter, SiteHeader } from '@/components/common';
import { getViewer } from '@/lib/visibility';

const STEPS = ['가치 진단', '매각 보고서', '판매 페이지 게시'];

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const viewer = getViewer(new Request('http://local', { headers: await headers() }));
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader viewer={viewer} active="sell">
        <div className="border-t bg-accent">
          <ol className="mx-auto flex h-11 max-w-6xl items-center gap-4 overflow-x-auto px-4 text-sm no-scrollbar md:px-6">
            {STEPS.map((s, i) => (
              <li key={s} className="flex shrink-0 items-center gap-2 text-accent-foreground">
                <span className="grid size-5 place-items-center bg-primary text-[11px] font-bold text-primary-foreground">{i + 1}</span>
                {s}
                {i < STEPS.length - 1 && <span aria-hidden className="text-muted-foreground">›</span>}
              </li>
            ))}
          </ol>
        </div>
      </SiteHeader>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-6 md:pb-12">{children}</main>
      <SiteFooter />
      <MobileTabBar active="sell" />
    </div>
  );
}
