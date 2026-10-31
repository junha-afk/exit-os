// AI 추정치 고지 (소유: A). AI 추정 숫자가 나오는 화면마다 붙인다.
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/** 가치 추정·리스크 보고서·회수 시나리오가 보이는 모든 화면에 붙인다 (SKILL.md §1-4). */
export function AiEstimateNotice({ className }: { className?: string }) {
  return (
    <p
      role="note"
      className={cn(
        'flex items-start gap-2 border border-dashed border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground',
        className,
      )}
    >
      <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      본 수치는 제공된 자료를 바탕으로 한 AI 추정치이며, 감정평가·법률·세무 자문을 대체하지 않습니다.
    </p>
  );
}
