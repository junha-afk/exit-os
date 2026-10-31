// 분석 실행: 저장된 재무 자료 + facts → AnalysisResult(+ 이상치 설명) 저장 (소유: B). 서버에서만 호출
import { getFacts } from '@/lib/facts/repo';
import { explainAnomalies } from '@/lib/report/prompts/anomaly';
import type { AnalysisResult } from '@/lib/types';
import { analyzeStore, DEFAULT_OWNER_HOURLY_WAGE } from './analyze';
import { getRecords, saveAnalysis } from './repo';

// 매출 자료가 없으면 null
export async function runAnalysis(storeId: string): Promise<AnalysisResult | null> {
  const [records, facts] = await Promise.all([getRecords(storeId), getFacts(storeId)]);
  const result = analyzeStore({
    storeId, records, facts,
    hourlyWage: Number(process.env.OWNER_HOURLY_WAGE) || DEFAULT_OWNER_HOURLY_WAGE,
  });
  if (!result) return null;
  result.anomalies = await explainAnomalies(result.anomalies, result.months);
  await saveAnalysis(result);
  return result;
}
