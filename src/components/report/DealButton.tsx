'use client';
// 거래 성사 → 인수인계 업무 자동 생성 → 인수인계 대시보드로 이동 (소유: B)
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DealButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function closeDeal() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/deals', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ listingId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '거래를 시작하지 못했어요.');
      // TODO(F): routes.ts 에 handoverDeal(id) 가 생기면 그걸로 교체
      router.push(`/handover/${json.dealId}`);
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={closeDeal}
        disabled={pending}
        className="min-h-12 border bg-background px-6 font-semibold hover:bg-muted disabled:opacity-50"
      >
        {pending ? '인수인계 업무 만드는 중' : '거래 성사 · 인수인계 시작하기'}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
