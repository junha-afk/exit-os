// 분석 실행: A가 저장한 재무 행 + facts → AnalysisResult(+ 이상치 설명) 저장 (소유: B). 서버에서만 호출
import { createHash } from 'node:crypto';
import { getFinancialRows } from '@/lib/documents/repo';
import { getFacts } from '@/lib/facts/repo';
import { explainAnomalies } from '@/lib/report/prompts/anomaly';
import type { AnalysisResult } from '@/lib/types';
import { analyzeStore, DEFAULT_OWNER_HOURLY_WAGE } from './analyze';
import { fromFinancialRows } from './parse';
import { getAnalysis, saveAnalysis } from './repo';

// 매출 자료가 없으면 null. 자료·facts 가 그대로면 저장된 결과를 돌려준다 (화면을 열 때마다 LLM을 부르지 않게)
export async function runAnalysis(storeId: string): Promise<AnalysisResult | null> {
  const [rows, facts] = await Promise.all([getFinancialRows(storeId), getFacts(storeId)]);
  const signature = createHash('sha1').update(JSON.stringify([rows, facts])).digest('hex');
  const cached = await getAnalysis(storeId, signature);
  if (cached) return cached;

  const result = analyzeStore({
    storeId, ...fromFinancialRows(rows), facts,
    hourlyWage: Number(process.env.OWNER_HOURLY_WAGE) || DEFAULT_OWNER_HOURLY_WAGE,
  });
  if (!result) return null;
  result.anomalies = await explainAnomalies(result.anomalies, result.months);
  await saveAnalysis(result, signature);
  return result;
}
