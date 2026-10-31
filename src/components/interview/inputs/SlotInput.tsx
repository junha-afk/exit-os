'use client';
// 질문 하나에 대한 입력 도구 (소유: A). 자유 문장 입력은 없다.
// onSubmit 으로 넘기는 값: 저장 형식(금액은 원) — 단 franchise·digital_accounts 처럼 slots.ts 에 fromInput 이 있는 슬롯은 화면 값 그대로.
import { useState } from 'react';
import type { ColumnInput, InputSpec } from '@/lib/interview/types';
import { cn } from '@/lib/utils';

const MAN = 10_000;

export function SlotInput({
  input, initial, submitLabel = '다음', pending, onSubmit,
}: {
  input: InputSpec;
  /** 수정할 때 현재 값 (저장 형식, 금액은 원) */
  initial?: unknown;
  submitLabel?: string;
  pending?: boolean;
  onSubmit: (value: unknown) => void;
}) {
  switch (input.type) {
    case 'choice':
      return (
        <div className="flex flex-wrap gap-2">
          {input.options.map((o) => (
            <button key={o} type="button" disabled={pending} onClick={() => onSubmit(o)}
              className={cn('min-h-11 border px-4 text-[15px] hover:border-primary hover:text-primary disabled:opacity-60', initial === o && 'border-primary bg-accent font-semibold text-accent-foreground')}>
              {o}
            </button>
          ))}
        </div>
      );
    case 'boolean':
      return <BooleanInput input={input} initial={initial} pending={pending} onSubmit={onSubmit} />;
    case 'multi':
      return <MultiInput options={input.options} initial={initial} submitLabel={submitLabel} pending={pending} onSubmit={onSubmit} />;
    case 'money':
      return <NumberLike unit="만원" initial={typeof initial === 'number' ? initial / MAN : undefined} step={1} min={0}
        hint={(n) => (n ? `= ${(n * MAN).toLocaleString('ko-KR')}원` : '')} submitLabel={submitLabel} pending={pending}
        onSubmit={(n) => onSubmit(Math.round(n * MAN))} />;
    case 'number':
      return <NumberLike unit={input.unit} min={input.min} max={input.max} step={input.step ?? 1}
        initial={typeof initial === 'number' ? initial : undefined} submitLabel={submitLabel} pending={pending} onSubmit={onSubmit} />;
    case 'month':
      return <SimpleField type="month" initial={typeof initial === 'string' ? initial : ''} submitLabel={submitLabel} pending={pending} onSubmit={onSubmit} />;
    case 'name':
      return <SimpleField type="text" maxLength={input.maxLength} placeholder={input.placeholder} initial={typeof initial === 'string' ? initial : ''}
        submitLabel={submitLabel} pending={pending} onSubmit={onSubmit} />;
    case 'time_range':
      return <TimeRange initial={initial as { open: string; close: string } | undefined} submitLabel={submitLabel} pending={pending} onSubmit={onSubmit} />;
    case 'percent_split':
      return <PercentSplit parts={input.parts} initial={initial as Record<string, number> | undefined} submitLabel={submitLabel} pending={pending} onSubmit={onSubmit} />;
    case 'table':
      return <TableInput input={input} initial={initial as Record<string, unknown>[] | undefined} submitLabel={submitLabel} pending={pending} onSubmit={onSubmit} />;
  }
}

function SubmitButton({ label, pending, disabled }: { label: string; pending?: boolean; disabled?: boolean }) {
  return (
    <button type="submit" disabled={pending || disabled} className="min-h-11 shrink-0 bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50">
      {pending ? '저장 중…' : label}
    </button>
  );
}

function NumberLike({ unit, min, max, step, initial, hint, submitLabel, pending, onSubmit }: {
  unit: string; min?: number; max?: number; step: number; initial?: number; hint?: (n: number) => string;
  submitLabel: string; pending?: boolean; onSubmit: (n: number) => void;
}) {
  const [v, setV] = useState(initial !== undefined ? String(initial) : '');
  const n = Number(v.replace(/,/g, ''));
  const valid = v.trim() !== '' && Number.isFinite(n);
  return (
    <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit(n); }}>
      <div className="flex gap-2">
        <label className="flex h-11 flex-1 items-center border bg-background focus-within:outline-2 focus-within:outline-ring">
          <input inputMode="decimal" autoFocus value={v} onChange={(e) => setV(e.target.value)} min={min} max={max} step={step}
            className="h-full w-full bg-transparent px-3 text-right text-lg tabular-nums outline-none" aria-label={`값 (${unit})`} />
          <span className="shrink-0 pr-3 text-sm text-muted-foreground">{unit}</span>
        </label>
        <SubmitButton label={submitLabel} pending={pending} disabled={!valid} />
      </div>
      {hint && valid && <p className="text-xs tabular-nums text-muted-foreground">{hint(n)}</p>}
    </form>
  );
}

function SimpleField({ type, initial, maxLength, placeholder, submitLabel, pending, onSubmit }: {
  type: 'month' | 'text'; initial: string; maxLength?: number; placeholder?: string; submitLabel: string; pending?: boolean; onSubmit: (v: string) => void;
}) {
  const [v, setV] = useState(initial);
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (v.trim()) onSubmit(v.trim()); }}>
      <input type={type} autoFocus value={v} onChange={(e) => setV(e.target.value)} maxLength={maxLength} placeholder={placeholder}
        className="h-11 flex-1 border bg-background px-3 text-[15px] tabular-nums outline-none focus:outline-2 focus:outline-ring" />
      <SubmitButton label={submitLabel} pending={pending} disabled={!v.trim()} />
    </form>
  );
}

function BooleanInput({ input, initial, pending, onSubmit }: {
  input: Extract<InputSpec, { type: 'boolean' }>; initial?: unknown; pending?: boolean; onSubmit: (v: boolean | null) => void;
}) {
  const [yes, no] = input.labels ?? ['예', '아니오'];
  const opts: { label: string; value: boolean | null }[] = [{ label: yes, value: true }, { label: no, value: false }];
  if (input.allowUnknown) opts.push({ label: '모르겠어요', value: null });
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map((o) => (
        <button key={o.label} type="button" disabled={pending} onClick={() => onSubmit(o.value)}
          className={cn('min-h-11 border px-4 text-[15px] hover:border-primary hover:text-primary disabled:opacity-60', initial === o.value && 'border-primary bg-accent font-semibold')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MultiInput({ options, initial, submitLabel, pending, onSubmit }: {
  options: string[]; initial?: unknown; submitLabel: string; pending?: boolean; onSubmit: (v: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>(Array.isArray(initial) ? (initial as string[]) : []);
  const toggle = (o: string) => setPicked((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]));
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (picked.length) onSubmit(picked); }}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = picked.includes(o);
          return (
            <button key={o} type="button" aria-pressed={on} onClick={() => toggle(o)}
              className={cn('min-h-11 border px-4 text-[15px]', on ? 'border-primary bg-accent font-semibold text-accent-foreground' : 'hover:border-primary')}>
              {on ? '✓ ' : ''}{o}
            </button>
          );
        })}
      </div>
      <div><SubmitButton label={picked.length ? `${picked.length}개 선택 · ${submitLabel}` : submitLabel} pending={pending} disabled={!picked.length} /></div>
    </form>
  );
}

function TimeRange({ initial, submitLabel, pending, onSubmit }: {
  initial?: { open: string; close: string }; submitLabel: string; pending?: boolean; onSubmit: (v: { open: string; close: string }) => void;
}) {
  const [open, setOpen] = useState(initial?.open ?? '09:00');
  const [close, setClose] = useState(initial?.close ?? '21:00');
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); onSubmit({ open, close }); }}>
      <input type="time" value={open} onChange={(e) => setOpen(e.target.value)} aria-label="여는 시간" className="h-11 border px-3 tabular-nums" />
      <span className="text-muted-foreground">~</span>
      <input type="time" value={close} onChange={(e) => setClose(e.target.value)} aria-label="닫는 시간" className="h-11 border px-3 tabular-nums" />
      <SubmitButton label={submitLabel} pending={pending} />
    </form>
  );
}

function PercentSplit({ parts, initial, submitLabel, pending, onSubmit }: {
  parts: { key: string; label: string }[]; initial?: Record<string, number>; submitLabel: string; pending?: boolean; onSubmit: (v: Record<string, number>) => void;
}) {
  const [vals, setVals] = useState<Record<string, string>>(Object.fromEntries(parts.map((p) => [p.key, String(initial?.[p.key] ?? '')])));
  const nums = Object.fromEntries(parts.map((p) => [p.key, Number(vals[p.key] || 0)]));
  const sum = Object.values(nums).reduce((a, b) => a + b, 0);
  return (
    <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); if (sum === 100) onSubmit(nums); }}>
      <div className="flex flex-wrap gap-2">
        {parts.map((p) => (
          <label key={p.key} className="flex h-11 items-center gap-2 border px-3">
            <span className="text-sm text-muted-foreground">{p.label}</span>
            <input inputMode="numeric" value={vals[p.key]} onChange={(e) => setVals({ ...vals, [p.key]: e.target.value })}
              className="w-14 bg-transparent text-right tabular-nums outline-none" />
            <span className="text-sm text-muted-foreground">%</span>
          </label>
        ))}
        <SubmitButton label={submitLabel} pending={pending} disabled={sum !== 100} />
      </div>
      <p className={cn('text-xs tabular-nums', sum === 100 ? 'text-muted-foreground' : 'text-amber-700')}>합계 {sum}%{sum !== 100 && ' · 100%가 되게 맞춰 주세요'}</p>
    </form>
  );
}

function TableInput({ input, initial, submitLabel, pending, onSubmit }: {
  input: Extract<InputSpec, { type: 'table' }>; initial?: Record<string, unknown>[]; submitLabel: string; pending?: boolean; onSubmit: (v: Record<string, unknown>[]) => void;
}) {
  const empty = () => Object.fromEntries(input.columns.map((c) => [c.key, ''])) as Record<string, string>;
  const toCell = (c: ColumnInput, v: unknown) => (v === undefined || v === null ? '' : c.type === 'money' ? String(Number(v) / MAN) : String(v));
  const [rows, setRows] = useState<Record<string, string>[]>(
    initial?.length ? initial.map((r) => Object.fromEntries(input.columns.map((c) => [c.key, toCell(c.input, r[c.key])]))) : [empty()],
  );
  const set = (i: number, k: string, v: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  const build = () =>
    rows
      .filter((r) => Object.values(r).some((v) => v.trim() !== ''))
      .map((r) => {
        const out: Record<string, unknown> = {};
        for (const c of input.columns) {
          const v = r[c.key]?.trim() ?? '';
          if (v === '') continue;
          out[c.key] = c.input.type === 'number' ? Number(v) : c.input.type === 'money' ? Math.round(Number(v) * MAN) : v;
        }
        return out;
      });

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); onSubmit(build()); }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              {input.columns.map((c) => <th key={c.key} className="py-2 pr-2 font-medium">{c.label}{c.input.type === 'money' ? ' (만원)' : ''}</th>)}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b">
                {input.columns.map((c) => (
                  <td key={c.key} className="py-2 pr-2">
                    {c.input.type === 'choice' ? (
                      <select value={r[c.key]} onChange={(e) => set(i, c.key, e.target.value)} className="h-10 w-full border bg-background px-2">
                        <option value="">선택</option>
                        {c.input.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input value={r[c.key]} onChange={(e) => set(i, c.key, e.target.value)}
                        inputMode={c.input.type === 'name' ? 'text' : 'decimal'}
                        maxLength={c.input.type === 'name' ? c.input.maxLength : undefined}
                        placeholder={c.input.type === 'name' ? c.input.placeholder : c.input.type === 'number' ? c.input.unit : ''}
                        className="h-10 w-full border bg-background px-2 tabular-nums" />
                    )}
                  </td>
                ))}
                <td>
                  <button type="button" aria-label="이 줄 삭제" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="grid size-10 place-items-center text-muted-foreground hover:text-foreground">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setRows((rs) => [...rs, empty()])} className="min-h-11 border px-4 text-sm">+ {input.addLabel}</button>
        <SubmitButton label={submitLabel} pending={pending} />
      </div>
    </form>
  );
}
