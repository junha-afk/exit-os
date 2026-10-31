'use client';
// 매물 목록 (소유: A). 세로 스크롤 목록 + ☰ 메뉴(정렬·필터). 필터는 받은 목록 안에서만 거른다.
import Image from 'next/image';
import Link from 'next/link';
import { Lock, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { formatKRW } from '@/lib/format';
import type { Sourced, Viewer } from '@/lib/types';
import { MobileTabBar } from './MobileTabBar';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';
import { ProvenanceBadge } from './ProvenanceBadge';
import { cn } from '@/lib/utils';
import { ROUTES } from './routes';

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

type AreaKey = 'all' | 's' | 'm' | 'l';
const AREAS: { key: AreaKey; label: string; test: (py: number) => boolean }[] = [
  { key: 'all', label: '전체', test: () => true },
  { key: 's', label: '10평 이하', test: (py) => py <= 10 },
  { key: 'm', label: '10~20평', test: (py) => py > 10 && py <= 20 },
  { key: 'l', label: '20평 이상', test: (py) => py > 20 },
];
// 금액 상한 선택지 (원). null = 제한 없음
const PREMIUM_MAX = [50_000_000, 100_000_000, 150_000_000, 200_000_000];
const RENT_MAX = [2_000_000, 3_000_000, 4_000_000];

const verifiedRatio = (r: ListingRow) => r.trust.verified / (r.trust.verified + r.trust.user_input + r.trust.needs_check || 1);

export function ListingBrowser({ rows, viewer }: { rows: ListingRow[]; viewer: Viewer }) {
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>('latest');
  const [industries, setIndustries] = useState<string[]>([]);
  const [district, setDistrict] = useState<string | null>(null);
  const [mostlyVerified, setMostlyVerified] = useState(false);
  const [noCheck, setNoCheck] = useState(false);
  const [query, setQuery] = useState('');
  const [premiumMax, setPremiumMax] = useState<number | null>(null);
  const [rentMax, setRentMax] = useState<number | null>(null);
  const [area, setArea] = useState<AreaKey>('all');

  // 상세 필터 서랍: Esc 로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const allIndustries = useMemo(() => [...new Set(rows.map((r) => r.industry))], [rows]);
  const allDistricts = useMemo(() => [...new Set(rows.map((r) => r.district))], [rows]);

  const q = query.trim();
  const shown = useMemo(() => {
    const list = rows.filter(
      (r) =>
        (industries.length === 0 || industries.includes(r.industry)) &&
        (!district || r.district === district) &&
        (!mostlyVerified || verifiedRatio(r) >= 0.5) &&
        (!noCheck || r.trust.needs_check === 0) &&
        (!premiumMax || r.premiumAsk <= premiumMax) &&
        (!rentMax || r.monthlyRent <= rentMax) &&
        AREAS.find((a) => a.key === area)!.test(r.areaPyeong) &&
        (!q || [r.displayName, r.district, r.near, r.industry, r.intro].some((t) => t.includes(q))),
    );
    if (sort === 'premium') list.sort((a, b) => a.premiumAsk - b.premiumAsk);
    if (sort === 'rent') list.sort((a, b) => a.monthlyRent - b.monthlyRent);
    if (sort === 'verified') list.sort((a, b) => verifiedRatio(b) - verifiedRatio(a));
    return list;
  }, [rows, sort, industries, district, mostlyVerified, noCheck, premiumMax, rentMax, area, q]);

  const summary = [
    district ?? '전체 지역',
    industries.length ? industries.join(', ') : '전체 업종',
    mostlyVerified && '증빙 절반 이상',
    premiumMax && `권리금 ${formatKRW(premiumMax, { unit: false })} 이하`,
    rentMax && `월세 ${formatKRW(rentMax, { unit: false })} 이하`,
    area !== 'all' && AREAS.find((a) => a.key === area)!.label,
    mostlyVerified && '증빙 절반 이상',
    noCheck && '확인 필요 없음',
    q && `"${q}"`,
  ].filter(Boolean);
  // 상세 필터 버튼에 표시할, 띠 밖(서랍)에서만 고르는 조건 수
  const detailCount = [district, area !== 'all', mostlyVerified, noCheck].filter(Boolean).length;

  function reset() {
    setSort('latest');
    setIndustries([]);
    setDistrict(null);
    setMostlyVerified(false);
    setNoCheck(false);
    setQuery('');
    setPremiumMax(null);
    setRentMax(null);
    setArea('all');
  }

  const avg = (f: (r: ListingRow) => number) => (shown.length ? shown.reduce((a, r) => a + f(r), 0) / shown.length : 0);

  return (
    <>
      <SiteHeader viewer={viewer} active="listings" hideSearch />

      {/* 페이지 머리: 연한 회녹 띠 + 업종 빠른 선택 */}
      <div className="border-b bg-accent">
        <div className="mx-auto max-w-6xl px-4 pb-4 pt-5 md:px-6 md:pb-5 md:pt-8">
          <h1 className="text-xl font-bold tracking-tight md:text-[26px]">매물 찾기</h1>
          <p className="mt-1 text-sm text-accent-foreground/80">숫자마다 출처가 붙은 매장 양도 매물이에요.</p>

          {/* 검색줄 (레퍼런스: BizBuySell 목록 상단 검색·필터 줄) */}
          <div role="search" className="mt-4 flex gap-2">
            <label className="flex h-12 min-w-0 flex-1 items-center gap-2 border bg-background px-3 focus-within:outline-2 focus-within:outline-ring">
              <Search aria-hidden className="size-5 text-muted-foreground" />
              <span className="sr-only">매물 검색</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="매장명, 동네, 역 이름"
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
              />
            </label>
            <div className="flex gap-2">
              <BandSelect
                label="업종"
                value={industries.length === 1 ? industries[0] : ''}
                onChange={(v) => setIndustries(v ? [v] : [])}
                options={allIndustries.map((i) => [i, i])}
                allLabel="업종 전체"
                className="hidden md:block"
              />
              <BandSelect
                label="권리금"
                value={premiumMax ? String(premiumMax) : ''}
                onChange={(v) => setPremiumMax(v ? Number(v) : null)}
                options={PREMIUM_MAX.map((n) => [String(n), `권리금 ${formatKRW(n, { unit: false })} 이하`])}
                allLabel="권리금 전체"
                className="hidden md:block"
              />
              <BandSelect
                label="월세"
                value={rentMax ? String(rentMax) : ''}
                onChange={(v) => setRentMax(v ? Number(v) : null)}
                options={RENT_MAX.map((n) => [String(n), `월세 ${formatKRW(n, { unit: false })} 이하`])}
                allLabel="월세 전체"
                className="hidden lg:block"
              />
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-1.5 border bg-background px-4 text-sm font-medium"
              >
                <SlidersHorizontal aria-hidden className="size-4" />
                <span className="md:hidden">필터</span>
                <span className="hidden md:inline">상세 필터</span>
                {detailCount > 0 && <span className="grid size-5 place-items-center bg-primary text-[11px] text-primary-foreground">{detailCount}</span>}
              </button>
              <button type="button" onClick={reset} className="hidden h-12 px-3 text-sm text-accent-foreground underline-offset-4 hover:underline md:block">
                초기화
              </button>
            </div>
          </div>

          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
            {[null, ...allIndustries].map((ind) => {
              const on = ind === null ? industries.length === 0 : industries.length === 1 && industries[0] === ind;
              return (
                <button
                  key={ind ?? 'all'}
                  type="button"
                  onClick={() => setIndustries(ind ? [ind] : [])}
                  className={cn(
                    'h-9 shrink-0 border px-3.5 text-sm transition-colors',
                    on ? 'border-primary bg-primary font-semibold text-primary-foreground' : 'border-border bg-background hover:border-foreground/40',
                  )}
                >
                  {ind ?? '전체'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 md:px-6 lg:grid-cols-[1fr_300px]">
        <main className="min-w-0">
          <div className="flex items-center justify-between gap-3 border-b py-3 text-[13px]">
            <p className="truncate text-muted-foreground">
              <b className="tabular-nums text-foreground">{shown.length}</b>개 · {summary.join(' · ')}
            </p>
            <label className="flex shrink-0 items-center gap-1 text-muted-foreground">
              <span className="sr-only">정렬</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-9 bg-transparent pr-1 text-foreground">
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </label>
          </div>
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

        {/* 데스크톱 오른쪽: 판매자 진입 + 지금 조건의 요약 */}
        <aside className="hidden space-y-6 self-start py-6 lg:sticky lg:top-24 lg:block">
          <div className="bg-primary p-6 text-primary-foreground">
            <p className="text-xs font-medium opacity-80">가게를 내놓을 계획이라면</p>
            <p className="mt-2 text-xl font-bold leading-snug">내 가게, 얼마에<br />넘길 수 있을까요?</p>
            <p className="mt-2 text-sm leading-relaxed opacity-85">POS·카드·배달 자료를 올리면 권리금 범위와 확인할 점을 정리해 드려요.</p>
            <Link href={ROUTES.sell} className="mt-5 flex h-11 items-center justify-center bg-background text-sm font-semibold text-primary hover:bg-accent">
              가치 진단 시작
            </Link>
          </div>
          <div className="border p-5">
            <p className="text-sm font-semibold">지금 조건의 매물</p>
            <dl className="mt-3 space-y-2 text-sm">
              <SummaryRow label="평균 권리금" value={formatKRW(avg((r) => r.premiumAsk))} />
              <SummaryRow label="평균 월세" value={formatKRW(avg((r) => r.monthlyRent))} />
              <SummaryRow label="평균 증빙 비율" value={`${Math.round(avg(verifiedRatio) * 100)}%`} />
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">목록에 보이는 {shown.length}개 매물 기준</p>
          </div>
        </aside>
      </div>

      <SiteFooter />
      <MobileTabBar active="listings" />

      {open && (
        <div className="fixed inset-0 z-30" role="dialog" aria-modal="true" aria-label="상세 필터">
          <button type="button" aria-label="닫기" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/40" />
          <aside className="absolute inset-y-0 right-0 flex w-[min(400px,100%)] flex-col bg-background">
            <div className="flex h-14 items-center justify-between border-b px-5">
              <p className="font-semibold">상세 필터</p>
              <button type="button" aria-label="닫기" onClick={() => setOpen(false)} className="-mr-2 grid size-11 place-items-center text-muted-foreground">
                <X aria-hidden className="size-5" />
              </button>
            </div>

            <div className="flex-1 divide-y overflow-y-auto px-5 text-sm">
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

              <Group title="금액">
                <div className="space-y-2">
                  <BandSelect label="권리금" value={premiumMax ? String(premiumMax) : ''} onChange={(v) => setPremiumMax(v ? Number(v) : null)} options={PREMIUM_MAX.map((n) => [String(n), `${formatKRW(n, { unit: false })} 이하`])} allLabel="권리금 전체" full />
                  <BandSelect label="월세" value={rentMax ? String(rentMax) : ''} onChange={(v) => setRentMax(v ? Number(v) : null)} options={RENT_MAX.map((n) => [String(n), `${formatKRW(n, { unit: false })} 이하`])} allLabel="월세 전체" full />
                </div>
              </Group>

              <Group title="면적">
                <div className="grid grid-cols-4 border-l border-t">
                  {AREAS.map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => setArea(a.key)}
                      className={cn('min-h-10 border-b border-r text-[13px]', area === a.key ? 'bg-foreground font-medium text-background' : 'hover:bg-muted')}
                    >
                      {a.label}
                    </button>
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
              <button type="button" onClick={() => setOpen(false)} className="h-12 flex-1 bg-primary text-sm font-semibold text-primary-foreground">
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
      <div className="relative h-[92px] w-[112px] shrink-0 overflow-hidden bg-muted md:h-[124px] md:w-[164px]">
        {r.photo ? (
          <Image src={r.photo} alt={`${r.displayName} 매장 사진`} fill sizes="(min-width: 768px) 164px, 112px" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
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
  return r.hasDetail ? <Link href={ROUTES.listing(r.id)} className="block focus-visible:outline-2 focus-visible:outline-ring">{body}</Link> : body;
}

function BandSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  className,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  allLabel: string;
  className?: string;
  full?: boolean;
}) {
  return (
    <label className={cn(full ? 'block' : 'w-40', className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn('h-12 w-full border bg-background px-3 text-sm', value && 'border-primary font-medium text-accent-foreground')}
      >
        <option value="">{allLabel}</option>
        {options.map(([v, t]) => (
          <option key={v} value={v}>{t}</option>
        ))}
      </select>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
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
