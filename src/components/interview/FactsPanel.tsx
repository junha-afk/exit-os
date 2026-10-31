'use client';
// 오른쪽 "채워진 정보" 패널 (소유: A). 값마다 출처 배지. 자료에서 읽은 값(🟠)은 근거 원문 + "맞아요". 모든 값은 같은 입력 도구로 수정.
import { useState } from 'react';
import { ProvenanceBadge } from '@/components/common';
import { SLOTS, SLOT_GROUPS, type SlotDef } from '@/lib/interview/slots';
import type { StoreFacts } from '@/lib/types';
import { SlotInput } from './inputs/SlotInput';

export function FactsPanel({
  storeId, facts, onChange,
}: {
  storeId: string;
  facts: StoreFacts;
  onChange: (facts: StoreFacts) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<{ key: string; msg: string } | null>(null);
  const filled = SLOTS.filter((s) => facts[s.key] !== undefined).length;

  async function save(slot: SlotDef, value: unknown) {
    setPending(slot.key);
    setError(null);
    try {
      const res = await fetch(`/api/stores/${storeId}/facts`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: slot.key, value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '저장하지 못했어요.');
      onChange(data.facts);
      setEditing(null);
    } catch (e) {
      setError({ key: slot.key, msg: e instanceof Error ? e.message : '저장하지 못했어요.' });
    } finally {
      setPending(null);
    }
  }

  async function confirm(slot: SlotDef) {
    setPending(slot.key);
    try {
      const res = await fetch(`/api/stores/${storeId}/facts/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: slot.key }),
      });
      if (res.ok) onChange({ ...facts, [slot.key]: { ...facts[slot.key]!, provenance: 'user_input' } });
    } finally {
      setPending(null);
    }
  }

  return (
    <aside aria-label="채워진 정보" className="border-t pt-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:border lg:p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">채워진 정보</h2>
        <span className="text-sm tabular-nums text-muted-foreground">{filled} / {SLOTS.length}</span>
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground">값을 누르면 고칠 수 있어요. 자료에서 읽은 값은 확인해 주세요.</p>

      {SLOT_GROUPS.map((group) => {
        const slots = SLOTS.filter((s) => s.group === group);
        return (
          <section key={group} className="mt-5">
            <h3 className="text-sm font-semibold">{group}</h3>
            <dl className="mt-2 divide-y border-y">
              {slots.map((slot) => {
                const f = facts[slot.key];
                const isEditing = editing === slot.key;
                return (
                  <div key={slot.key} className="py-2.5">
                    <div className="flex items-start gap-2">
                      <dt className="w-24 shrink-0 pt-0.5 text-[13px] text-muted-foreground">{slot.label}</dt>
                      <dd className="min-w-0 flex-1">
                        {f ? (
                          <button type="button" onClick={() => setEditing(isEditing ? null : slot.key)} className="text-left text-sm font-medium tabular-nums hover:underline">
                            {slot.display(f.value)}
                          </button>
                        ) : (
                          <button type="button" onClick={() => setEditing(isEditing ? null : slot.key)} className="text-left text-sm text-muted-foreground hover:text-foreground">
                            아직 없음 · 입력
                          </button>
                        )}
                        {f?.provenance === 'needs_check' && f.note && <p className="mt-1 text-xs text-amber-700">근거 · {f.note}</p>}
                      </dd>
                      {f && <ProvenanceBadge provenance={f.provenance} compact />}
                    </div>
                    {f?.provenance === 'needs_check' && !isEditing && (
                      <div className="mt-2 flex gap-2 pl-26">
                        <button type="button" disabled={pending === slot.key} onClick={() => confirm(slot)} className="h-9 bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60">맞아요</button>
                        <button type="button" onClick={() => setEditing(slot.key)} className="h-9 border px-3 text-xs">고칠래요</button>
                      </div>
                    )}
                    {isEditing && (
                      <div className="mt-3">
                        <SlotInput
                          input={slot.input.type === 'multi' && slot.needsOptions && !slot.input.options.length
                            ? { ...slot.input, options: Array.from(new Set([...(slot.defaultOptions ?? []), ...((f?.value as string[] | undefined) ?? [])])) }
                            : slot.input}
                          initial={f ? (slot.toInput ? slot.toInput(f.value) : f.value) : undefined}
                          submitLabel="저장"
                          pending={pending === slot.key}
                          onSubmit={(v) => save(slot, v)}
                        />
                        {error?.key === slot.key && <p role="alert" className="mt-2 text-sm text-destructive">{error.msg}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </dl>
          </section>
        );
      })}
    </aside>
  );
}
