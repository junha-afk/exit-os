import { NextResponse } from 'next/server';
import { runAnalysis } from '@/lib/analysis/run';

// POST /api/stores/:id/analyze → AnalysisResult (이상치에 설명 포함)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await runAnalysis(id);
  if (!result) {
    return NextResponse.json({ error: 'POS 매출이나 배달앱 정산 자료를 먼저 올려주세요.' }, { status: 400 });
  }
  return NextResponse.json(result);
}
