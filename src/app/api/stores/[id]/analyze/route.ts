import { NextResponse } from 'next/server';
import { getFacts } from '@/lib/facts/repo';
import { analyzeStore, DEFAULT_OWNER_HOURLY_WAGE } from '@/lib/analysis/analyze';
import { getRecords, saveAnalysis } from '@/lib/analysis/repo';
import { explainAnomalies } from '@/lib/report/prompts/anomaly';

// POST /api/stores/:id/analyze → AnalysisResult (이상치에 설명 포함)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [records, facts] = await Promise.all([getRecords(id), getFacts(id)]);
  const result = analyzeStore({
    storeId: id, records, facts,
    hourlyWage: Number(process.env.OWNER_HOURLY_WAGE) || DEFAULT_OWNER_HOURLY_WAGE,
  });
  if (!result) {
    return NextResponse.json({ error: 'POS 매출이나 배달앱 정산 자료를 먼저 올려주세요.' }, { status: 400 });
  }
  result.anomalies = await explainAnomalies(result.anomalies, result.months);
  await saveAnalysis(result);
  return NextResponse.json(result);
}
