'use client';
// 진단 화면 본체 (소유: A). 왼쪽: 대화 기록 + 지금 질문(입력 도구) 또는 자료 요청 / 오른쪽: 채워진 정보 패널.
import Link from 'next/link';
import { FileText, Loader2, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ROUTES } from '@/components/common/routes';
import { DocumentDrop } from '@/components/upload/DocumentDrop';
import type { InterviewResponse } from '@/lib/interview/types';
import type { StoreFacts } from '@/lib/types';
import { FactsPanel } from './FactsPanel';
import { SlotInput } from './inputs/SlotInput';

export function DiagnoseClient({ storeId }: { storeId: string }) {
  const [data, setData] = useState<InterviewResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const call = useCallback(async (body: Record<string, unknown>) => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/interview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storeId, mode: 'diagnosis', ...body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '다시 시도해 주세요.');
      setData(json as InterviewResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : '다시 시도해 주세요.');
    } finally {
      setPending(false);
    }
  }, [storeId]);

  useEffect(() => { void call({}); }, [call]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [data?.history.length, data?.step]);

  const setFacts = (facts: StoreFacts) => setData((d) => (d ? { ...d, facts } : d));
  const step = data?.step ?? null;
  const pct = Math.round((data?.progress ?? 0) * 100);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <section aria-label="진단 대화" className="min-w-0">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-[32px]">내 가게 가치 진단</h1>
            <p className="mt-1 text-sm text-muted-foreground">질문에 숫자·버튼으로 답하고, 요청하는 자료를 올려주세요. 문장으로 쓸 필요 없어요.</p>
          </div>
          <button type="button" disabled={pending} onClick={() => { if (confirm('입력한 내용과 올린 자료를 모두 지우고 처음부터 시작할까요?')) void call({ reset: true }); }}
            className="flex min-h-11 shrink-0 items-center gap-1.5 border px-3 text-sm disabled:opacity-60">
            <RotateCcw aria-hidden className="size-4" /> 처음부터
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="h-2 flex-1 bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="진단 진행률">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="w-12 text-right text-sm font-semibold tabular-nums">{pct}%</span>
        </div>

        <ol className="mt-6 flex flex-col gap-3">
          {data?.history.map((h, i) => {
            if (h.kind === 'question') return <li key={i} className="max-w-[85%] bg-muted px-4 py-3 text-[15px]">{h.text}</li>;
            if (h.kind === 'answer') {
              return (
                <li key={i} className="ml-auto max-w-[85%] border border-primary/30 bg-accent px-4 py-2.5 text-[15px] text-accent-foreground">
                  <span className="mr-2 text-xs text-muted-foreground">{h.label}</span>{h.display}
                </li>
              );
            }
            if (h.kind === 'declined') return <li key={i} className="ml-auto text-sm text-muted-foreground">{h.label} · 없어요</li>;
            return (
              <li key={i} className="ml-auto w-full max-w-[85%] border px-4 py-3 text-sm">
                <p className="flex items-center gap-1.5 font-semibold"><FileText aria-hidden className="size-4 text-primary" />{h.label} · <span className="font-normal text-muted-foreground">{h.filename}</span></p>
                {h.unreadable ? (
                  <p className="mt-1 text-amber-700">내용을 읽지 못했어요. 더 선명한 사진이나 다른 파일로 올려주세요.</p>
                ) : (
                  <>
                    {h.summary && <p className="mt-1 leading-relaxed text-muted-foreground">{h.summary}</p>}
                    {h.filled.length > 0 && <p className="mt-2">채운 정보 · {h.filled.join(' · ')} <span className="text-amber-700">(오른쪽에서 확인해 주세요)</span></p>}
                    {h.recordCount > 0 && <p className="mt-1 tabular-nums">매출·비용 기록 {h.recordCount.toLocaleString('ko-KR')}줄을 읽었어요</p>}
                  </>
                )}
              </li>
            );
          })}
        </ol>

        <div ref={bottomRef} className="mt-6 border-t pt-6">
          {!data && pending && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 aria-hidden className="size-4 animate-spin" />준비 중이에요</p>}
          {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}

          {step?.type === 'ask_slot' && (
            <div key={`${step.slot}-${data?.history.length}`}>
              <p className="text-xs font-medium text-primary">{step.label}</p>
              <p className="mt-1 text-lg font-semibold">{step.text}</p>
              <div className="mt-4">
                <SlotInput input={step.input} pending={pending} onSubmit={(value) => void call({ answer: { slot: step.slot, value } })} />
              </div>
            </div>
          )}

          {step?.type === 'request_document' && (
            <div key={`${step.docKind}-${data?.history.length}`}>
              <p className="text-xs font-medium text-primary">자료 요청 · {step.label}</p>
              <p className="mt-1 text-lg font-semibold">{step.text}</p>
              {step.reason && <p className="mt-1 text-sm text-muted-foreground">{step.reason}</p>}
              <div className="mt-4">
                <DocumentDrop storeId={storeId} docKind={step.docKind} label={step.label}
                  onDone={() => void call({})} onDecline={() => void call({})} />
              </div>
            </div>
          )}

          {data && !step && (
            <div className="border bg-accent px-5 py-5">
              <p className="font-semibold">진단에 필요한 정보가 모두 모였어요.</p>
              <p className="mt-1 text-sm text-muted-foreground">오른쪽에서 🟠 확인 필요 값을 확인한 뒤 보고서를 만들어 보세요.</p>
            </div>
          )}

          {data && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href={ROUTES.sellReport} className={data.canFinish
                ? 'flex min-h-12 items-center bg-primary px-5 font-semibold text-primary-foreground'
                : 'flex min-h-11 items-center border px-4 text-sm'}>
                {data.canFinish ? '매각 보고서 만들기' : '지금까지 내용으로 보고서 보기'}
              </Link>
              {pending && step && <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Loader2 aria-hidden className="size-4 animate-spin" />다음 질문을 고르는 중</span>}
            </div>
          )}
        </div>
      </section>

      {data && <FactsPanel storeId={storeId} facts={data.facts} onChange={setFacts} />}
    </div>
  );
}
