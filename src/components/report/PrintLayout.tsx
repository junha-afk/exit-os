// 인쇄(PDF) 전용 부분 (소유: B). 화면에서는 숨고 window.print() 때만 보인다
// 시뮬레이터 입력칸 대신 희망 권리금 기준 회수 기간 표를 넣는다
import { AiEstimateNotice } from '@/components/common';
import { paybackScenarios } from '@/lib/analysis/payback';
import { formatKRW, formatMonths } from '@/lib/format';
import type { Valuation } from '@/lib/types';

const PAGE_STYLE = `@media print {
  @page { size: A4; margin: 14mm; }
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

export function PrintHeader({ storeName }: { storeName: string }) {
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <div className="hidden border-b pb-4 print:block">
      <style>{PAGE_STYLE}</style>
      <p className="text-sm font-extrabold text-primary">ExitOS 매각 준비 보고서</p>
      <p className="mt-1 text-xs text-muted-foreground">{storeName} · {today} 작성</p>
      <p className="mt-2 text-xs text-muted-foreground">
        출처 라벨: 증빙 확인 = 두 개 이상 독립 자료가 ±3% 안에서 일치 · 사용자 입력 = 점주가 입력하거나 단일 자료 · 확인 필요 = 누락·불일치·이상치
      </p>
    </div>
  );
}

export function PrintPayback({ valuation, premium, initialCost }: { valuation: Valuation; premium: number; initialCost: number }) {
  const scenarios = paybackScenarios(premium, initialCost, valuation);
  return (
    <section className="hidden break-inside-avoid print:block">
      <h2 className="text-2xl font-bold">투자금 회수 시나리오</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        희망 권리금 {formatKRW(premium)} + 예상 초기 비용 {formatKRW(initialCost)} 기준
      </p>
      <table className="mt-3 w-full border-y text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 font-normal">시나리오</th>
            <th className="py-2 text-right font-normal">월 영업이익</th>
            <th className="py-2 text-right font-normal">회수 기간</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {scenarios.map((s) => (
            <tr key={s.label}>
              <td className="py-2 font-semibold">{s.label}</td>
              <td className="py-2 text-right tabular-nums">{formatKRW(s.monthlyProfit)}</td>
              <td className="py-2 text-right tabular-nums">{Number.isFinite(s.months) ? formatMonths(s.months) : '회수 불가'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <AiEstimateNotice className="mt-3" />
    </section>
  );
}
