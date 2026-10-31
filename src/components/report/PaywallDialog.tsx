'use client';
// PDF 다운로드 = 유료 기능 (소유: B). MVP: 결제 모달 목업 → window.print() 인쇄 레이아웃 (PRD B-4)
// 실제 결제·카드 정보 입력 없음. 결제 상태는 이 탭에서만 기억한다
import { Download } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

// 데모 가격 — 실제 가격은 팀 결정 필요 (PRD §7: 판매자 매각 보고서 PDF 건당 결제)
export const REPORT_PDF_PRICE = 19_900;   // formatKRW 는 만 원 단위로 반올림하므로 쓰지 않는다

const INCLUDED = ['손익·월별 추이와 출처 라벨', '확인이 필요한 항목과 제출할 증빙', 'AI 점수·매장 가치 추정 범위', '투자금 회수 시나리오'];

export function PaywallDialog() {
  const [open, setOpen] = useState(false);
  const [paid, setPaid] = useState(false);

  // 모달이 닫힌 뒤 인쇄해야 모달이 PDF에 찍히지 않는다
  const print = () => setTimeout(() => window.print(), 150);

  return (
    <>
      <button
        type="button"
        onClick={() => (paid ? print() : setOpen(true))}
        className="inline-flex min-h-11 items-center gap-1.5 border bg-background px-4 text-sm font-medium hover:bg-muted print:hidden"
      >
        <Download aria-hidden className="size-4" />
        PDF로 저장하기
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>매각 보고서 PDF</DialogTitle>
          <DialogDescription>구매자·중개사에게 그대로 보낼 수 있는 인쇄용 보고서예요.</DialogDescription>
          <ul className="mt-2 divide-y border-y text-sm">
            {INCLUDED.map((item) => <li key={item} className="py-2">{item}</li>)}
          </ul>
          <p className="mt-2 flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">1건</span>
            <span className="text-2xl font-bold tabular-nums">{REPORT_PDF_PRICE.toLocaleString('ko-KR')}원</span>
          </p>
          <button
            type="button"
            onClick={() => { setPaid(true); setOpen(false); print(); }}
            className="mt-2 min-h-12 w-full bg-primary font-semibold text-primary-foreground"
          >
            결제하고 PDF 저장하기
          </button>
          <p className="text-center text-xs text-muted-foreground">데모용 결제 화면이에요. 실제로 결제되지 않아요.</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
