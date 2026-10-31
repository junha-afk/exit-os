'use client';
// 랜딩 (소유: A). ① 영수증 히어로 → ② 기능(브라우저 화면이 스크롤로 바뀜) → 마무리 CTA.
// 원본 목업: docs/mockups/landing/index.html
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ROUTES } from '../routes';
import './landing.css';

const STEPS = [
  { label: '01 · 진단', title: '묻는 대로 답하고, 자료를 올리면 끝', body: 'AI가 가게에 대해 하나씩 물어보고, POS·카드·배달 정산 파일을 올리면 겹치는 매출은 지우고 숫자마다 출처를 붙여요.', url: 'exitos.kr/seller/diagnose' },
  { label: '02 · 가치 정산서', title: '수상한 달은 먼저 잡아내요', body: '평소와 다른 달은 주황색으로 표시하고, 시설·영업 권리금을 나눠 범위로 보여줘요. 막대를 눌러 이유를 확인해 보세요.', url: 'exitos.kr/seller/report' },
  { label: '03 · 판매 페이지', title: '보여줄 만큼만, 단계적으로 공개', body: '누구나 보는 정보, 구독자가 보는 재무, 판매자가 승인해야 보는 권리금 구성까지 공개 범위를 나눠요.', url: 'exitos.kr/listings/mangwon-a' },
];

// 화면 2: 최근 12개월 매출(백만 원)과 확인이 필요한 달
const REV = [26.4, 25.1, 28.6, 23.9, 23.2, 27.1, 27.8, 29.1, 29.3, 29.7, 41.9, 27.6];
const MONTHS = ['25.10', '25.11', '25.12', '26.01', '26.02', '26.03', '26.04', '26.05', '26.06', '26.07', '26.08', '26.09'];
const NOTES: Record<number, string> = {
  5: '3월: 원재료 매입 자료가 빠졌어요 (자료 누락)',
  7: '5월: POS 카드 매출과 카드사 정산이 5% 달라요',
  10: '8월: 현금 매출 1,400만 원 — 평소의 9배예요. 현금영수증·통장 내역을 내면 반영돼요',
};

const ramp = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const progress = (el: HTMLElement) => Math.min(1, Math.max(0, -el.getBoundingClientRect().top / (el.offsetHeight - innerHeight)));

export function Landing() {
  const heroRef = useRef<HTMLElement>(null);
  const [heroP, setHeroP] = useState(0);
  const [step, setStep] = useState(0);
  const [barNote, setBarNote] = useState('막대를 눌러 보세요');
  const [subbed, setSubbed] = useState(false);

  // ① 섹션 안 스크롤 진행도(0~1). 움직임 줄이기 설정이면 완성된 상태만 보여준다
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const update = () => {
      raf = 0;
      if (heroRef.current) setHeroP(reduce ? 1 : progress(heroRef.current));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // ② 왼쪽 단계가 화면 가운데 오면 오른쪽 화면 교체
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.landing .step');
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setStep(Number(e.target.getAttribute('data-step')))), { rootMargin: '-45% 0px -45% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const out = ramp(heroP, 0.1, 0.4);
  const inn = ramp(heroP, 0.4, 0.7);

  return (
    <div className="landing bg-background text-foreground">
      {/* 머리글 */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-6">
          <Link href={ROUTES.home} className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-primary">
            <span aria-hidden className="grid size-6 place-items-center bg-primary text-[13px] font-black text-primary-foreground">E</span>ExitOS
          </Link>
          <nav aria-label="랜딩 메뉴" className="hidden gap-1 text-[15px] text-muted-foreground md:flex">
            <a className="px-3 py-2 hover:text-foreground" href="#features">기능</a>
            <Link className="px-3 py-2 hover:text-foreground" href={ROUTES.listings}>매물 찾기</Link>
          </nav>
          <Link href={ROUTES.listings} className="ml-auto hidden text-sm text-muted-foreground hover:text-foreground sm:block">매물 둘러보기</Link>
          <Link href={ROUTES.sell} className="ml-auto flex h-10 items-center bg-primary px-4 text-sm font-semibold text-primary-foreground sm:ml-0">가치 진단 시작</Link>
        </div>
      </header>

      {/* ① 히어로: 출력구에서 뽑히는 영수증. 스크롤하면 영수증 위 글만 바뀐다 */}
      <section ref={heroRef} className="relative h-[200vh] border-b bg-[#3b2a1c]">
        <div className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col items-center overflow-hidden px-4 md:px-6">
          {/* 배경 사진: 위에서 본 카페 테이블 (Unsplash) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/table-cappuccino.jpg" alt="" className="absolute inset-0 size-full object-cover object-[50%_60%]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(20,14,8,.45))]" />

          <div className="printer relative z-20 mt-4 w-full max-w-[520px] px-6 pb-2 pt-3">
            <p className="mb-2 text-center font-mono text-[10px] tracking-[.3em] text-white/50">EXITOS · SETTLEMENT PRINTER</p>
            <div className="mouth" />
          </div>
          <div className="relative w-full max-w-[508px] overflow-hidden px-6 pb-10">
            <div className="paper-shadow">
              <article className="receipt paper print relative px-6 pb-10 pt-7 text-center font-mono text-neutral-800 md:px-8" aria-label="ExitOS 가치 정산서">
                <p className="text-[12px] font-bold tracking-[.25em]">EXITOS 가치 정산서</p>
                <p className="mt-1 text-[10px] text-muted-foreground">No. 2026-1031-0042 · 2026.10.31 14:20</p>
                <div className="my-4 border-t border-dashed border-neutral-300" />

                <div className="relative h-[200px] overflow-hidden md:h-[210px]">
                  <h1
                    className="absolute inset-x-0 top-1/2 font-sans text-[38px] font-extrabold leading-[1.18] tracking-tight text-neutral-900 md:text-[50px]"
                    style={{ opacity: 1 - out, transform: `translateY(calc(-50% - ${out * 90}px))` }}
                  >
                    <span className="line-in block" style={{ animationDelay: '1.1s' }}>나도 몰랐던</span>
                    <span className="line-in block" style={{ animationDelay: '1.5s' }}>내 가게의</span>
                    <span className="line-in block text-primary" style={{ animationDelay: '1.9s' }}>진짜 가치</span>
                  </h1>
                  <div
                    className="absolute inset-x-0 top-1/2 font-sans"
                    aria-hidden={inn < 0.5}
                    style={{ opacity: inn, transform: `translateY(calc(-50% + ${(1 - inn) * 90}px))`, pointerEvents: inn > 0.5 ? 'auto' : 'none' }}
                  >
                    <h2 className="text-[28px] font-extrabold leading-[1.25] tracking-tight text-neutral-900 md:text-[34px]">
                      단 몇 분 만에<br /><span className="text-primary">가게 가치를 확인</span>해 보세요
                    </h2>
                    <div className="mt-6 flex justify-center gap-2">
                      <Link href={ROUTES.sell} tabIndex={inn < 0.5 ? -1 : undefined} className="flex h-12 items-center bg-primary px-5 text-[15px] font-semibold text-primary-foreground">가게 가치 진단</Link>
                      <Link href={ROUTES.listings} tabIndex={inn < 0.5 ? -1 : undefined} className="flex h-12 items-center border border-primary/30 bg-white px-5 text-[15px] font-semibold text-accent-foreground">매물 확인하기</Link>
                    </div>
                  </div>
                </div>

                <div className="my-4 border-t border-dashed border-neutral-300" />
                <div className="line-in space-y-1.5 text-left text-[12px]" style={{ animationDelay: '2.3s' }}>
                  {['시설권리금', '바닥권리금', '영업권리금'].map((k) => (
                    <p key={k} className="flex items-end"><span className="font-sans">{k}</span><span className="dots" /><span className="tabular-nums">₩ ?</span></p>
                  ))}
                </div>
                <div className="my-4 border-t-2 border-neutral-800" />
                <p className="line-in flex items-end justify-between" style={{ animationDelay: '2.6s' }}>
                  <span className="font-sans text-[13px] font-bold">합계</span>
                  <span className="text-[20px] font-bold tabular-nums text-primary">₩ ———,———,———</span>
                </p>

                <div className="seal pointer-events-none absolute bottom-5 left-5 grid size-[72px] place-items-center border-[3px] border-primary font-sans text-primary">
                  <div className="leading-tight"><p className="text-[10px] font-semibold tracking-widest">EXITOS</p><p className="text-[14px] font-black">정산 대기</p></div>
                </div>
                <div className="mt-5 text-right">
                  <div className="ml-auto h-8 w-36 md:w-44 bg-[repeating-linear-gradient(90deg,#222_0_2px,transparent_2px_4px,#222_4px_5px,transparent_5px_8px)]" />
                  <p className="mt-1 text-[10px] tracking-[.3em] text-muted-foreground">EXIT·OS·0042</p>
                </div>
              </article>
            </div>
          </div>

          <p
            className="hero-in absolute bottom-4 z-30 flex items-center gap-2 bg-black/40 px-3 py-1.5 text-sm text-white"
            style={{ animationDelay: '2.9s', visibility: heroP > 0.05 ? 'hidden' : 'visible' }} /* 애니메이션 opacity 를 덮지 못하므로 visibility 로 숨긴다 */
          >
            <span aria-hidden className="inline-block h-px w-8 bg-white/70" /> 스크롤해서 금액을 확인해 보세요
          </p>
        </div>
      </section>

      {/* ② 기능: 왼쪽 설명 / 오른쪽 브라우저 화면 (스크롤로 바뀜) */}
      <section id="features" className="dotgrid border-b bg-background">
        <div className="mx-auto max-w-6xl px-4 pt-20 md:px-6">
          <p className="font-mono text-xs font-medium uppercase tracking-[.2em] text-primary">How it works</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">모은 자료를 보고서와 매물에 연결해요</h2>
        </div>

        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-24 md:px-6 lg:grid-cols-[1fr_1.15fr]">
          <ol className="relative ml-10 mt-8 border-l-2 border-[#c8d6cf] pl-8 lg:mt-0">
            {STEPS.map((s, i) => (
              <li key={s.label} data-step={i} className={cn('step flex flex-col justify-center py-8 lg:min-h-[78vh] lg:py-0', step === i && 'on')}>
                <p className="relative font-mono text-sm text-primary"><span className="marker" />{s.label}</p>
                <h3 className="mt-2 text-2xl font-bold">{s.title}</h3>
                <p className="mt-3 max-w-md leading-relaxed text-neutral-700">{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="hidden lg:block">
            <div className="sticky top-0 flex h-screen items-center">
              {/* 브라우저 창 프레임 (shots.so 내보내기 이미지). 주소창·화면 칸 위에 실제 내용을 얹는다 */}
              <div className="relative w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/landing/browser.png" alt="" className="block w-full select-none" draggable={false} />
                <span className="absolute left-[33.84%] top-[4.78%] grid h-[2.4%] w-[32.3%] place-items-center font-mono text-[10px] text-muted-foreground">{STEPS[step].url}</span>
                <div className="absolute left-[1.875%] top-[8.37%] flex h-[87.93%] w-[96.25%] flex-col overflow-hidden bg-white">
                  <div className="relative flex-1 overflow-hidden bg-white [zoom:.9]">
                    {/* 화면 1: 진단 */}
                    <div className={cn('screen grid grid-cols-[1.1fr_1fr]', step === 0 && 'on')}>
                      <div className="space-y-3 border-r p-5 text-[13px]">
                        <p className="w-fit max-w-[85%] bg-muted px-3 py-2">가게 문을 연 지 얼마나 됐나요?</p>
                        <p className="ml-auto w-fit max-w-[85%] bg-primary px-3 py-2 text-white">2022년 9월이요, 4년 됐어요</p>
                        <p className="w-fit max-w-[85%] bg-muted px-3 py-2">점주님이 직접 하시는 일은요?</p>
                        <p className="ml-auto w-fit max-w-[85%] bg-primary px-3 py-2 text-white">원두 로스팅이랑 발주, SNS요</p>
                        <div className="border border-dashed border-primary/40 bg-accent p-3 text-[12px] text-accent-foreground">파일을 끌어다 놓으세요 · 6종 중 <b>6종 완료</b></div>
                      </div>
                      <div className="space-y-2 p-5 text-[12px]">
                        <p className="text-[11px] font-semibold text-muted-foreground">정리된 매장 정보</p>
                        <p className="flex justify-between border-b pb-1.5">개업 <span>2022.09 <em className="border border-sky-200 bg-sky-50 px-1 text-[10px] not-italic text-sky-800">입력</em></span></p>
                        <p className="flex justify-between border-b pb-1.5">월평균 매출 <span>2,830만 <em className="border border-amber-300 bg-amber-50 px-1 text-[10px] not-italic text-amber-900">확인 필요</em></span></p>
                        <p className="flex justify-between border-b pb-1.5">카드 매출 <span>2,310만 <em className="border border-emerald-200 bg-emerald-50 px-1 text-[10px] not-italic text-emerald-800">증빙</em></span></p>
                        <p className="flex justify-between border-b pb-1.5">중복 제거 <span className="font-semibold text-primary">6건</span></p>
                      </div>
                    </div>

                    {/* 화면 2: 정산서 (막대 누르면 이유) */}
                    <div className={cn('screen p-6', step === 1 && 'on')}>
                      <p className="text-[13px] font-semibold">최근 12개월 매출</p>
                      <div className="mt-3 flex h-36 items-end gap-1.5">
                        {REV.map((v, i) => (
                          <button
                            key={MONTHS[i]}
                            type="button"
                            aria-label={`${MONTHS[i]} 매출 ${v}백만 원`}
                            onClick={() => setBarNote(NOTES[i] ?? `${MONTHS[i]} 매출 ${Math.round(v * 100).toLocaleString()}만 원 · 이상 없음`)}
                            className={cn('flex-1', NOTES[i] ? 'bg-amber-400 hover:bg-amber-500' : 'bg-slate-300 hover:bg-slate-400')}
                            style={{ height: `${(v / 45) * 100}%` }}
                          />
                        ))}
                      </div>
                      <p className="mt-2 h-10 text-[12px] text-muted-foreground">{barNote}</p>
                      <p className="mt-2 text-[12px] font-semibold">권리금 구성</p>
                      <div className="mt-1.5 flex h-3"><div className="w-[25%] bg-primary" /><div className="w-[22%] bg-[#378262]" /><div className="w-[53%] bg-[#9cc9b4]" /></div>
                      <div className="mt-1.5 flex gap-4 text-[11px] text-muted-foreground"><span>시설 4,000만</span><span>바닥 3,500만</span><span>영업 8,500만</span></div>
                    </div>

                    {/* 화면 3: 판매 페이지 (구독 토글) */}
                    <div className={cn('screen grid grid-cols-[1.4fr_1fr]', step === 2 && 'on')}>
                      <div className="p-5">
                        <div className="aspect-[16/7] bg-cover bg-center" style={{ backgroundImage: "url('/stores/mangwon-1.jpg')" }} />
                        <p className="mt-3 text-lg font-bold">망원동 카페 A</p>
                        <p className="text-[12px] text-muted-foreground">카페 · 망원역 5분 · 개업 4년</p>
                        <div className="relative mt-3 border p-3">
                          <div className={cn('grid grid-cols-3 gap-2 text-[12px] transition-[filter] duration-500', !subbed && 'blur-[5px]')}>
                            <div><p className="text-muted-foreground">월 매출</p><p className="font-bold">2,830만</p></div>
                            <div><p className="text-muted-foreground">영업이익</p><p className="font-bold">1,095만</p></div>
                            <div><p className="text-muted-foreground">회수</p><p className="font-bold">17.6개월</p></div>
                          </div>
                          {!subbed && <p className="absolute inset-0 grid place-items-center text-[12px] font-semibold">구독하면 볼 수 있어요</p>}
                        </div>
                      </div>
                      <div className="border-l p-5 text-[12px]">
                        <p className="text-muted-foreground">희망 권리금</p>
                        <p className="text-xl font-bold">1억 6,000만</p>
                        <button type="button" onClick={() => setSubbed((v) => !v)} className="mt-3 h-10 w-full bg-primary text-[13px] font-semibold text-white">
                          {subbed ? '구독 중 · 다시 잠그기' : '구독하고 열람하기'}
                        </button>
                        <p className="mt-3 text-[11px] text-muted-foreground">눌러서 공개 범위가 바뀌는 걸 확인해 보세요</p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 마무리 CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">내 가게, 지금 얼마일까요?</h2>
            <p className="mt-2 text-primary-foreground/80">자료를 올리면 10분 안에 정산서를 받아볼 수 있어요.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={ROUTES.sell} className="flex h-12 items-center bg-white px-6 font-semibold text-primary">내 가게 가치 진단 시작</Link>
            <Link href={ROUTES.listings} className="flex h-12 items-center border border-white/40 px-6 font-semibold">매물 확인하기</Link>
          </div>
        </div>
      </section>
      <footer className="bg-muted">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground md:px-6">ExitOS · VERY×NEXT 해커톤 8팀 · 일러스트 Open Peeps(CC0, Pablo Stanley) · 사진 Unsplash · 추정치는 감정평가·법률·세무 자문을 대체하지 않습니다.</p>
      </footer>
    </div>
  );
}
