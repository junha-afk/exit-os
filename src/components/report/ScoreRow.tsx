// AI 점수 3종 (소유: B). 점수는 코드가 계산하고, 화면은 뜻을 같이 보여준다
import type { Scores } from '@/lib/types';

const ITEMS: { key: keyof Scores; label: string; hint: string; higherIsRisk?: boolean }[] = [
  { key: 'revenueStability', label: '매출 안정성', hint: '월별 매출이 고를수록 높아요' },
  { key: 'dataCompleteness', label: '자료 완성도', hint: '빠진 달이 적고 증빙이 많을수록 높아요' },
  { key: 'ownerDependency', label: '운영 의존도', hint: '점주가 직접 하는 일이 많을수록 높아요 (높을수록 위험)', higherIsRisk: true },
];

export function ScoreRow({ scores }: { scores: Scores }) {
  return (
    <dl className="grid divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {ITEMS.map((item) => {
        const v = scores[item.key];
        const warn = item.higherIsRisk ? v >= 70 : v < 50;
        return (
          <div key={item.key} className="py-4 sm:px-4 sm:first:pl-0">
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">
              {v}<span className="ml-0.5 text-sm font-normal text-muted-foreground">/100</span>
            </dd>
            <div className="mt-2 h-1.5 bg-muted" aria-hidden>
              <div className={warn ? 'h-full bg-amber-500' : 'h-full bg-primary'} style={{ width: `${v}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{item.hint}</p>
          </div>
        );
      })}
    </dl>
  );
}
