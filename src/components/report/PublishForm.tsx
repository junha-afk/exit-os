'use client';
// 판매 페이지 게시 폼 (소유: B). facts 기본값으로 채우고 점주가 확인·수정해 게시한다
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ROUTES } from '@/components/common/routes';
import type { PremiumBreakdown } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ManwonInput } from './ManwonInput';

export interface PublishDefaults {
  premiumAsk: number; deposit: number; monthlyRent: number; maintenanceFee: number; estInitialCost: number;
  premiumBreakdown: PremiumBreakdown;
  premiumBreakdownLevel: 'public' | 'approved';
  intro: string;
}

const LEVELS = [
  { value: 'approved', label: '열람 승인한 구매자에게만', hint: '권리금 구성을 승인 후 공개해요' },
  { value: 'public', label: '모두에게', hint: '구독하지 않은 구매자도 볼 수 있어요' },
] as const;

export function PublishForm({ storeId, defaults, publishedId }: { storeId: string; defaults: PublishDefaults; publishedId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState(defaults);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const set = <K extends keyof PublishDefaults>(key: K, value: PublishDefaults[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setBreakdown = (key: keyof PremiumBreakdown, value: number) =>
    setForm((f) => ({ ...f, premiumBreakdown: { ...f.premiumBreakdown, [key]: value } }));

  const b = form.premiumBreakdown;
  const breakdownSum = b.facility + b.goodwill + b.other;
  const breakdownOk = breakdownSum === 0 || breakdownSum === form.premiumAsk;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!breakdownOk) { setError('권리금 구성의 합이 희망 권리금과 같아야 해요.'); return; }
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          storeId, ...form,
          premiumBreakdown: breakdownSum ? form.premiumBreakdown : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '게시하지 못했어요.');
      router.push(ROUTES.listing(json.listingId));
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} aria-labelledby="publish-title">
      <h2 id="publish-title" className="text-2xl font-bold">판매 페이지로 게시하기</h2>
      <p className="mt-1 text-sm text-muted-foreground">진단에서 입력한 값으로 채웠어요. 확인하고 고칠 곳이 있으면 바꿔 주세요.</p>

      <fieldset className="mt-6 grid gap-4 border-t pt-6 sm:grid-cols-2">
        <legend className="sr-only">매각 가격</legend>
        <ManwonInput label="희망 권리금" value={form.premiumAsk} onChange={(v) => set('premiumAsk', v)} />
        <ManwonInput label="예상 초기 인수 비용" value={form.estInitialCost} onChange={(v) => set('estInitialCost', v)} />
        <ManwonInput label="임대보증금" value={form.deposit} onChange={(v) => set('deposit', v)} />
        <ManwonInput label="월 임대료" value={form.monthlyRent} onChange={(v) => set('monthlyRent', v)} />
        <ManwonInput label="관리비" value={form.maintenanceFee} onChange={(v) => set('maintenanceFee', v)} />
      </fieldset>

      <fieldset className="mt-6 border-t pt-6">
        <legend className="text-sm font-semibold">권리금 구성</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <ManwonInput label="시설" value={b.facility} onChange={(v) => setBreakdown('facility', v)} />
          <ManwonInput label="영업" value={b.goodwill} onChange={(v) => setBreakdown('goodwill', v)} />
          <ManwonInput label="기타(바닥)" value={b.other} onChange={(v) => setBreakdown('other', v)} />
        </div>
        {!breakdownOk && <p className="mt-2 text-sm text-destructive">구성의 합이 희망 권리금과 달라요.</p>}
        <div role="radiogroup" aria-label="권리금 구성 공개 범위" className="mt-4 grid gap-2 sm:grid-cols-2">
          {LEVELS.map((l) => (
            <label
              key={l.value}
              className={cn('flex min-h-11 cursor-pointer items-start gap-2 border px-3 py-2', form.premiumBreakdownLevel === l.value && 'border-primary bg-accent')}
            >
              <input
                type="radio"
                name="premiumBreakdownLevel"
                value={l.value}
                checked={form.premiumBreakdownLevel === l.value}
                onChange={() => set('premiumBreakdownLevel', l.value)}
                className="mt-1 accent-[var(--primary)]"
              />
              <span>
                <span className="block text-sm font-medium">{l.label}</span>
                <span className="block text-xs text-muted-foreground">{l.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6 border-t pt-6">
        <legend className="text-sm font-semibold">매장 소개</legend>
        <p className="mt-1 text-xs text-muted-foreground">보고서 요약으로 채웠어요. 판매 페이지 맨 위에 보여요.</p>
        <textarea
          aria-label="매장 소개"
          value={form.intro}
          onChange={(e) => set('intro', e.target.value)}
          maxLength={600}
          rows={4}
          className="mt-2 w-full border bg-background px-3 py-2 text-[15px] leading-relaxed"
        />
      </fieldset>

      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 bg-primary px-6 font-semibold text-primary-foreground disabled:opacity-50"
        >
          {pending ? '게시하는 중' : publishedId ? '판매 페이지 다시 게시하기' : '판매 페이지로 게시하기'}
        </button>
        {publishedId && (
          <a href={ROUTES.listing(publishedId)} className="text-sm underline underline-offset-4">게시된 판매 페이지 보기</a>
        )}
      </div>
    </form>
  );
}
