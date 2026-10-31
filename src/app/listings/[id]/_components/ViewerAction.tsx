'use client';
// 역할별 다음 행동 버튼 (소유: A). 시연에서는 누르면 다음 역할로 쿠키를 바꿔 블러가 풀리는 걸 보여준다.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { DEMO_ROLE_COOKIE } from '@/components/common';
import type { Viewer } from '@/lib/types';

const NEXT: Partial<Record<Viewer, { label: string; hint: string; to: Viewer }>> = {
  buyer: { label: '구독하고 열람하기', hint: '재무·운영·AI 분석 등 잠긴 항목이 열려요.', to: 'buyer_subscribed' },
  buyer_subscribed: {
    label: '열람 승인 요청하기',
    hint: '판매자가 승인하면 권리금 구성까지 볼 수 있어요.',
    to: 'buyer_approved',
  },
};

const BTN =
  'flex min-h-11 w-full items-center justify-center bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60';

export function ViewerAction({ viewer, listingId }: { viewer: Viewer; listingId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = NEXT[viewer];

  if (!next) {
    return viewer === 'seller' ? (
      <p className="text-sm text-muted-foreground">판매자 화면이에요. 구매자에게는 공개 범위에 따라 일부가 가려져 보여요.</p>
    ) : (
      <Link href={`/listings/${listingId}/risk`} className={BTN}>
        구매자용 리스크 보고서 보기
      </Link>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        className={BTN}
        onClick={() => {
          document.cookie = `${DEMO_ROLE_COOKIE}=${next.to}; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
          startTransition(() => router.refresh());
        }}
      >
        {next.label}
      </button>
      <p className="text-xs text-muted-foreground">{next.hint}</p>
    </div>
  );
}
