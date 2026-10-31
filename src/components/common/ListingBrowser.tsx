'use client';
// 매물 목록 (소유: A). 세로 스크롤 목록 + ☰ 메뉴(정렬·필터). 필터는 받은 목록 안에서만 거른다.
import Image from 'next/image';
import Link from 'next/link';
import { Lock, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
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

const verifiedRatio = (r: ListingRow) => r.trust.verified / (r.trust.verified + r.trust.user_input + r.trust.needs_check || 1);

export function ListingBrowser({ rows, viewer }: { rows: ListingRow[]; viewer: Viewer }) {
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

  const avg = (f: (r: ListingRow) => number) => (shown.length ? shown.reduce((a, r) => a + f(r), 0) / shown.length : 0);

  return (
    <>
      <SiteHeader viewer={viewer} active="listings" onMenuClick={() => setOpen(true)} />

      {/* 페이지 머리: 연한 회녹 띠 + 업종 빠른 선택 */}
      <div className="border-b bg-accent">
        <div className="mx-auto max-w-6xl px-4 pb-4 pt-5 md:px-6 md:pb-5 md:pt-8">
          <h1 className="text-xl font-bold tracking-tight md:text-[26px]">매물 찾기</h1>
          <p className="mt-1 text-sm text-accent-foreground/80">숫자마다 출처가 붙은 매장 양도 매물이에요.</p>
          <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
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
            <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 shrink-0 items-center gap-1.5 border border-border bg-background px-3.5 text-sm">
              <SlidersHorizontal aria-hidden className="size-4" />
              필터
            </button>
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
