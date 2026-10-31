'use client';
// 매물 목록 (소유: A). 세로 스크롤 목록 + ☰ 메뉴(정렬·필터). 필터는 받은 목록 안에서만 거른다.
import Image from 'next/image';
import Link from 'next/link';
import { Lock, Menu, Search, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { formatKRW } from '@/lib/format';
import type { Sourced } from '@/lib/types';
import { ProvenanceBadge } from './ProvenanceBadge';
import { cn } from '@/lib/utils';

export interface ListingRow {
  id: string;
  hasDetail: boolean;            // 상세 데이터가 있는 매물만 링크
  photo?: string;
  displayName: string;
  industry: string;
  district: string;              // '마포구'
  near: string;                  // '망원역 5분'
  openedYears: number;
  premiumAsk: number;
  deposit: number;
  monthlyRent: number;
  areaPyeong: number;
  floor: number;
  intro: string;
  trust: { verified: number; user_input: number; needs_check: number };
  profitLocked: boolean;         // 서버 필터 결과. true 면 월 이익을 그리지 않는다
  monthlyProfit?: Sourced<number>;
}

type SortKey = 'latest' | 'premium' | 'rent' | 'verified';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'latest', label: '최신순' },
  { key: 'premium', label: '권리금 낮은순' },
  { key: 'rent', label: '월세 낮은순' },
  { key: 'verified', label: '증빙 확인 많은순' },
];

const verifiedRatio = (r: ListingRow) => r.trust.verified / (r.trust.verified + r.trust.user_input + r.trust.needs_check || 1);

export function ListingBrowser({ rows, header }: { rows: ListingRow[]; header: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>('latest');
  const [industries, setIndustries] = useState<string[]>([]);
  const [district, setDistrict] = useState<string | null>(null);
  const [mostlyVerified, setMostlyVerified] = useState(false);
  const [noCheck, setNoCheck] = useState(false);

  const allIndustries = useMemo(() => [...new Set(rows.map((r) => r.industry))], [rows]);
  const allDistricts = useMemo(() => [...new Set(rows.map((r) => r.district))], [rows]);

  const shown = useMemo(() => {
    const list = rows.filter(
      (r) =>
        (industries.length === 0 || industries.includes(r.industry)) &&
        (!district || r.district === district) &&
        (!mostlyVerified || verifiedRatio(r) >= 0.5) &&
        (!noCheck || r.trust.needs_check === 0),
    );
    if (sort === 'premium') list.sort((a, b) => a.premiumAsk - b.premiumAsk);
    if (sort === 'rent') list.sort((a, b) => a.monthlyRent - b.monthlyRent);
    if (sort === 'verified') list.sort((a, b) => verifiedRatio(b) - verifiedRatio(a));
    return list;
  }, [rows, sort, industries, district, mostlyVerified, noCheck]);

  const summary = [
    district ?? '전체 지역',
    industries.length ? industries.join(', ') : '전체 업종',
    mostlyVerified && '증빙 절반 이상',
    noCheck && '확인 필요 없음',
  ].filter(Boolean);

  function reset() {
    setSort('latest');
    setIndustries([]);
    setDistrict(null);
    setMostlyVerified(false);
    setNoCheck(false);
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <button type="button" aria-label="정렬·필터 열기" onClick={() => setOpen(true)} className="-ml-2 grid size-11 place-items-center">
            <Menu aria-hidden className="size-5" />
          </button>
          <span className="text-[17px] font-bold">ExitOS</span>
          <div className="ml-2 flex h-9 flex-1 items-center gap-2 bg-muted px-3 text-sm text-muted-foreground">
            <Search aria-hidden className="size-4" />
            동네나 역 이름
          </div>
          {header}
        </div>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 pb-2.5 text-[13px]">
          <p className="truncate text-muted-foreground">
            {summary.join(' · ')} · <span className="text-foreground">{SORTS.find((s) => s.key === sort)?.label}</span>
          </p>
          <p className="shrink-0 text-muted-foreground"><b className="tabular-nums text-foreground">{shown.length}</b>개</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4">
        <ul className="divide-y">
          {shown.map((r) => (
            <li key={r.id}>
              <Row row={r} />
            </li>
          ))}
        </ul>
        {shown.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            조건에 맞는 매물이 없어요.{' '}
            <button type="button" onClick={reset} className="font-medium text-foreground underline underline-offset-4">조건 초기화</button>
          </div>
        )}
      </main>

      {open && (
        <div className="fixed inset-0 z-30" role="dialog" aria-modal="true" aria-label="정렬과 필터">
          <button type="button" aria-label="닫기" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/40" />
          <aside className="absolute inset-y-0 left-0 flex w-[min(380px,100%)] flex-col bg-background">
            <div className="flex h-14 items-center justify-between border-b px-5">
              <p className="font-semibold">정렬 · 필터</p>
              <button type="button" aria-label="닫기" onClick={() => setOpen(false)} className="-mr-2 grid size-11 place-items-center text-muted-foreground">
                <X aria-hidden className="size-5" />
              </button>
            </div>

            <div className="flex-1 divide-y overflow-y-auto px-5 text-sm">
              <Group title="정렬">
                <div className="space-y-1">
                  {SORTS.map((s) => (
                    <label key={s.key} className="flex min-h-10 cursor-pointer items-center justify-between">
                      <span className={cn(sort !== s.key && 'text-muted-foreground')}>{s.label}</span>
                      <input type="radio" name="sort" checked={sort === s.key} onChange={() => setSort(s.key)} className="size-4 accent-foreground" />
                    </label>
                  ))}
                </div>
              </Group>

              <Group title="지역">
                <div className="grid grid-cols-3 border-l border-t">
                  {[null, ...allDistricts].map((d) => (
                    <button
                      key={d ?? 'all'}
                      type="button"
                      onClick={() => setDistrict(d)}
                      className={cn('min-h-10 border-b border-r', district === d ? 'bg-foreground font-medium text-background' : 'hover:bg-muted')}
                    >
                      {d ?? '전체'}
                    </button>
                  ))}
                </div>
              </Group>

              <Group title="업종">
                <div className="grid grid-cols-2 gap-y-1">
                  {allIndustries.map((ind) => (
                    <label key={ind} className="flex min-h-10 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={industries.includes(ind)}
                        onChange={(e) => setIndustries((cur) => (e.target.checked ? [...cur, ind] : cur.filter((x) => x !== ind)))}
                        className="size-4 accent-foreground"
                      />
                      {ind}
                    </label>
                  ))}
                </div>
              </Group>

              <Group title="자료" hint="판매자가 올린 매출 자료를 증빙과 맞춰본 결과로 걸러요">
                <Toggle label="증빙 확인된 숫자가 절반 이상" on={mostlyVerified} onChange={setMostlyVerified} />
                <Toggle label="확인 필요 항목 없음" on={noCheck} onChange={setNoCheck} />
              </Group>
            </div>

            <div className="flex gap-2 border-t p-4">
              <button type="button" onClick={reset} className="h-12 w-24 border text-sm">초기화</button>
              <button type="button" onClick={() => setOpen(false)} className="h-12 flex-1 bg-foreground text-sm font-semibold text-background">
                매물 {shown.length}개 보기
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function Row({ row: r }: { row: ListingRow }) {
  const body = (
    <div className={cn('flex gap-4 py-5', r.hasDetail && 'group')}>
      <div className="relative h-[124px] w-[164px] shrink-0 overflow-hidden bg-muted">
        {r.photo ? (
          <Image src={r.photo} alt={`${r.displayName} 매장 사진`} fill sizes="164px" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">사진 준비 중</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-muted-foreground">{r.industry} · {r.district} · {r.near} · 개업 {r.openedYears}년</p>
        <p className="mt-0.5 font-semibold group-hover:underline group-hover:underline-offset-4">{r.displayName}</p>
        <p className="mt-1.5 text-[17px] font-bold tabular-nums">권리금 {formatKRW(r.premiumAsk, { unit: false })}</p>
        <p className="text-sm tabular-nums text-muted-foreground">
          보증금 {formatKRW(r.deposit, { unit: false })} · 월세 {formatKRW(r.monthlyRent, { unit: false })} · {r.areaPyeong}평 {r.floor}층
        </p>
        <p className="mt-1.5 truncate text-sm text-muted-foreground">{r.intro}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 text-xs tabular-nums text-muted-foreground">
          <Dot className="bg-emerald-500" label={`증빙 ${r.trust.verified}`} />
          <Dot className="bg-sky-500" label={`입력 ${r.trust.user_input}`} />
          {r.trust.needs_check > 0 && <Dot className="bg-amber-500" label={`확인 필요 ${r.trust.needs_check}`} warn />}
          {r.profitLocked ? (
            <span className="inline-flex items-center gap-1"><Lock aria-hidden className="size-3" />월 이익은 구독 후 공개</span>
          ) : (
            r.monthlyProfit && (
              <span className="inline-flex items-center gap-1.5 text-foreground">
                월 영업이익 <b>{formatKRW(r.monthlyProfit.value, { unit: false })}</b>
                <ProvenanceBadge provenance={r.monthlyProfit.provenance} compact />
              </span>
            )
          )}
        </p>
      </div>
    </div>
  );
  return r.hasDetail ? <Link href={`/listings/${r.id}`} className="block focus-visible:outline-2 focus-visible:outline-ring">{body}</Link> : body;
}

function Dot({ className, label, warn }: { className: string; label: string; warn?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1', warn && 'text-amber-700')}>
      <i aria-hidden className={cn('inline-block size-1.5 rounded-full', className)} />
      {label}
    </span>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="py-5">
      <p className="font-semibold">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between">
      <span className={cn(!on && 'text-muted-foreground')}>{label}</span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      {/* 스위치는 익숙한 둥근 모양 유지 (네모 규칙 예외) */}
      <span aria-hidden className={cn('relative h-6 w-10 rounded-full transition-colors', on ? 'bg-foreground' : 'bg-muted-foreground/30')}>
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-background shadow-sm transition-all', on ? 'left-[18px]' : 'left-0.5')} />
      </span>
    </label>
  );
}
