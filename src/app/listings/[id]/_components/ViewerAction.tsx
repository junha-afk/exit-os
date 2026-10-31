'use client';
// 다음 행동 버튼 (소유: A). 구독 → 열람 승인 요청 → 리스크 보고서 순서로 바뀐다. 역할을 고르는 화면은 없다.
import Link from 'next/link';
import { useMembership } from '@/components/common';
import type { Viewer } from '@/lib/types';
import { ROUTES } from '@/components/common/routes';

const NEXT: Partial<Record<Viewer, { label: string; hint: string; to: Viewer }>> = {
  buyer: { label: '구독하고 열람하기', hint: '재무·운영·AI 분석 등 잠긴 항목이 열려요.', to: 'buyer_subscribed' },
  buyer_subscribed: {
    label: '열람 승인 요청하기',
    hint: '판매자가 승인하면 권리금 구성까지 볼 수 있어요.',
    to: 'buyer_approved',
  },
};

const BTN =
  'flex min-h-12 w-full items-center justify-center bg-primary px-4 text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60';

export function ViewerAction({ viewer, listingId, compact }: { viewer: Viewer; listingId: string; compact?: boolean }) {
  const { pending, set } = useMembership();
  const next = NEXT[viewer];

  if (!next) {
    return viewer === 'seller' ? (
      <p className="text-sm text-muted-foreground">내가 올린 매물이에요.</p>
    ) : (
      <Link href={ROUTES.risk(listingId)} className={BTN}>
        리스크 보고서 보기
      </Link>
    );
  }

  return (
    <div className="space-y-2">
      <button type="button" disabled={pending} className={BTN} onClick={() => set(next.to)}>
        {next.label}
      </button>
      {!compact && <p className="text-xs text-muted-foreground">{next.hint}</p>}
    </div>
  );
}
