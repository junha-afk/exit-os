'use client';
// 자료 올리기 칸 (소유: A). 형식 제한 없음. "이 자료는 없어요" 버튼. 올리면 서버에서 LLM이 읽는다.
import { FileUp, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface UploadResponse {
  document: { filename: string; summary: string; unreadable: boolean };
  filledFacts: { key: string; label: string; display: string; evidence: string }[];
  recordCount: number;
}

export function DocumentDrop({
  storeId, docKind, label, onDone, onDecline,
}: {
  storeId: string;
  docKind: string;
  label: string;
  onDone: (r: UploadResponse) => void;
  onDecline: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  async function upload(file: File) {
    setBusy('upload');
    setError(null);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('requestedKind', docKind);
      const res = await fetch(`/api/stores/${storeId}/upload`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '자료를 읽지 못했어요.');
      onDone(data as UploadResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : '자료를 읽지 못했어요.');
    } finally {
      setBusy(null);
    }
  }

  async function decline() {
    setBusy('decline');
    setError(null);
    try {
      const res = await fetch(`/api/stores/${storeId}/documents/decline`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: docKind }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? '처리하지 못했어요.');
      onDecline();
    } catch (e) {
      setError(e instanceof Error ? e.message : '처리하지 못했어요.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={!!busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) upload(f); }}
        className={cn('flex min-h-32 flex-col items-center justify-center gap-2 border border-dashed px-4 py-6 text-center', over ? 'border-primary bg-accent' : 'hover:border-primary', busy && 'opacity-80')}
      >
        {busy === 'upload' ? (
          <>
            <Loader2 aria-hidden className="size-6 animate-spin text-primary" />
            <span className="font-medium">{label}을(를) 읽는 중이에요</span>
            <span className="text-sm text-muted-foreground">문서·사진은 10초쯤 걸릴 수 있어요</span>
          </>
        ) : (
          <>
            <FileUp aria-hidden className="size-6 text-primary" />
            <span className="font-medium">{label} 올리기</span>
            <span className="text-sm text-muted-foreground">눌러서 고르거나 끌어다 놓으세요 · 사진·CSV·텍스트 (10MB까지)</span>
          </>
        )}
      </button>
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(f); }} />
      <div className="flex items-center justify-between gap-3">
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : <span />}
        <button type="button" disabled={!!busy} onClick={decline} className="min-h-11 shrink-0 border px-4 text-sm disabled:opacity-60">
          {busy === 'decline' ? '처리 중…' : '이 자료는 없어요'}
        </button>
      </div>
    </div>
  );
}
