// 비슷한 매물 가로 목록 (소유: A). 아래 스크롤 막대로 좌우 이동한다 (자동 넘김 없음).
import Image from 'next/image';
import Link from 'next/link';
import type { ListingRow } from '@/components/common';
import { formatKRW } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/components/common/routes';

export function SimilarListings({ rows }: { rows: ListingRow[] }) {
  return (
    <section aria-labelledby="similar-title">
      <h2 id="similar-title" className="mb-4 text-2xl font-bold tracking-tight">
        비슷한 매물 <span className="tabular-nums text-muted-foreground">{rows.length}</span>
      </h2>
      <ul className="scroll-strip -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-4">
        {rows.map((r) => (
          <li key={r.id} className="w-[248px] shrink-0 snap-start">
            {r.hasDetail ? (
              <Link href={ROUTES.listing(r.id)} className="group block focus-visible:outline-2 focus-visible:outline-ring">
                <Card row={r} />
              </Link>
            ) : (
              <Card row={r} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Card({ row: r }: { row: ListingRow }) {
  return (
    <article>
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {r.photo && (
          <Image src={r.photo} alt={`${r.displayName} 매장 사진`} fill sizes="248px" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        )}
      </div>
      <p className="mt-3 truncate text-[13px] font-semibold">
        {r.industry} <span className="font-normal text-muted-foreground">· {r.near}</span>
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums">권리금 {formatKRW(r.premiumAsk, { unit: false })}</p>
      <p className="text-sm tabular-nums text-muted-foreground">
        보증금 {formatKRW(r.deposit, { unit: false })} · 월세 {formatKRW(r.monthlyRent, { unit: false })}
      </p>
      <div className="mt-3 border-t pt-3 text-sm">
        <p className="tabular-nums text-muted-foreground">{r.areaPyeong}평 · {r.floor}층 · 개업 {r.openedYears}년</p>
        <p className="mt-1 truncate">{r.intro}</p>
        <p className="mt-2 flex gap-3 text-xs tabular-nums text-muted-foreground">
          <Dot className="bg-emerald-500" label={`증빙 ${r.trust.verified}`} />
          <Dot className="bg-sky-500" label={`입력 ${r.trust.user_input}`} />
          {r.trust.needs_check > 0 && <Dot className="bg-amber-500" label={`확인 필요 ${r.trust.needs_check}`} warn />}
        </p>
      </div>
    </article>
  );
}

function Dot({ className, label, warn }: { className: string; label: string; warn?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1', warn && 'text-amber-700')}>
      <i aria-hidden className={cn('inline-block size-1.5 rounded-full', className)} />
      {label}
    </span>
  );
}
