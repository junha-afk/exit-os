// 출처 배지 🟢🔵🟠 (소유: A)
import { AlertTriangle, PencilLine, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { Provenance } from '@/lib/types';
import { cn } from '@/lib/utils';

const META: Record<Provenance, { label: string; description: string; Icon: LucideIcon; className: string }> = {
  verified: {
    label: '증빙 확인',
    description: '두 개 이상의 원본 자료와 대조해 일치함',
    Icon: ShieldCheck,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  user_input: {
    label: '사용자 입력',
    description: '점주가 직접 기재한 값',
    Icon: PencilLine,
    className: 'border-sky-200 bg-sky-50 text-sky-800',
  },
  needs_check: {
    label: '확인 필요',
    description: '누락·불일치 또는 추가 검증이 필요한 값',
    Icon: AlertTriangle,
    className: 'border-amber-300 bg-amber-50 text-amber-900',
  },
};

export function provenanceLabel(p: Provenance) {
  return META[p].label;
}

/** 수치 출처 라벨. 색만으로 구분하지 않도록 아이콘과 글자를 함께 쓴다. */
export function ProvenanceBadge({
  provenance,
  compact = false,
  className,
}: {
  provenance: Provenance;
  /** true면 아이콘만 표시(글자는 스크린리더용으로 유지) */
  compact?: boolean;
  className?: string;
}) {
  const { label, description, Icon, className: tone } = META[provenance];
  return (
    <span
      title={description}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border font-medium leading-none',
        compact ? 'size-6 justify-center' : 'px-2 py-1 text-xs',
        tone,
        className,
      )}
    >
      <Icon aria-hidden className={compact ? 'size-3.5' : 'size-3'} />
      <span className={compact ? 'sr-only' : undefined}>{label}</span>
    </span>
  );
}
