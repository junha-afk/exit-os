'use client';
// 재무 CSV 6종 업로드 (소유: B). A의 진단 페이지에 끼워 넣는다 (docs/TEAM_PLAN.md §4).
import { useState } from 'react';
import { Check, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RECORD_KINDS, type RecordKind, type UploadResult } from '@/lib/types';

const KIND_META: Record<RecordKind, { label: string; file: string }> = {
  pos: { label: 'POS 매출', file: 'pos_sales.csv' },
  card_settlement: { label: '카드사 정산', file: 'card_settlement.csv' },
  delivery: { label: '배달앱 정산', file: 'delivery_settlement.csv' },
  purchases: { label: '원재료 매입', file: 'purchases.csv' },
  fixed: { label: '임대료·공과금', file: 'fixed_costs.csv' },
  payroll: { label: '급여', file: 'payroll.csv' },
};

type RowState = { status: 'idle' | 'uploading' } | { status: 'done'; result: UploadResult } | { status: 'error'; message: string };

export function UploadPanel({
  storeId, highlight, onUploaded,
}: {
  storeId: string;
  highlight?: RecordKind;
  onUploaded?: (kind: RecordKind, r: UploadResult) => void;
}) {
  const [rows, setRows] = useState<Partial<Record<RecordKind, RowState>>>({});

  async function upload(kind: RecordKind, file: File) {
    setRows((s) => ({ ...s, [kind]: { status: 'uploading' } }));
    const body = new FormData();
    body.set('kind', kind);
    body.set('file', file);
    try {
      const res = await fetch(`/api/stores/${storeId}/upload`, { method: 'POST', body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '업로드에 실패했습니다.');
      setRows((s) => ({ ...s, [kind]: { status: 'done', result: json } }));
      onUploaded?.(kind, json);
    } catch (e) {
      setRows((s) => ({ ...s, [kind]: { status: 'error', message: (e as Error).message } }));
    }
  }

  return (
    <section aria-label="재무 자료 업로드">
      <h3 className="text-sm font-semibold">재무 자료 (CSV)</h3>
      <ul className="mt-2 divide-y border-y">
        {RECORD_KINDS.map((kind) => {
          const row = rows[kind] ?? { status: 'idle' };
          const inputId = `upload-${kind}`;
          return (
            <li key={kind} className={cn('flex items-center gap-3 px-3 py-3', highlight === kind && 'bg-accent')}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{KIND_META[kind].label}</p>
                <p className="text-muted-foreground text-xs">{KIND_META[kind].file}</p>
                {row.status === 'done' && (
                  <p className="mt-1 text-xs tabular-nums">
                    {row.result.rows}행 반영
                    {row.result.dedupedRows > 0 && ` · 중복 제거됨 ${row.result.dedupedRows}건`}
                  </p>
                )}
                {row.status === 'done' && row.result.warnings.map((w) => (
                  <p key={w} className="mt-0.5 text-xs text-amber-700">{w}</p>
                ))}
                {row.status === 'error' && <p className="text-destructive mt-1 text-xs">{row.message}</p>}
              </div>
              <label
                htmlFor={inputId}
                className={cn(
                  'inline-flex min-h-11 cursor-pointer items-center gap-1.5 border px-3 text-sm font-medium hover:bg-muted',
                  row.status === 'uploading' && 'pointer-events-none opacity-50',
                )}
              >
                {row.status === 'done' ? <Check className="size-4" /> : <Upload className="size-4" />}
                {row.status === 'uploading' ? '올리는 중' : row.status === 'done' ? '다시 올리기' : '파일 선택'}
              </label>
              <input
                id={inputId}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload(kind, file);
                  e.target.value = '';
                }}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
