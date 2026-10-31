// 보고서 저장소 (소유: B). 서버 메모리 — Supabase 로 옮길 때 이 파일 안만 바꾼다
// 보고서는 그 보고서를 만든 분석 결과에 묶는다. 자료가 바뀌면 runAnalysis 가 새 결과를 만들므로 이전 보고서는 자동으로 버려진다
import type { AnalysisResult } from '@/lib/types';
import type { SellerReport } from './types';

const g = globalThis as typeof globalThis & { __exitosReports?: WeakMap<AnalysisResult, SellerReport> };
const reports = (g.__exitosReports ??= new WeakMap());

export async function saveSellerReport(analysis: AnalysisResult, report: SellerReport): Promise<void> {
  reports.set(analysis, report);
}

export async function getSellerReport(analysis: AnalysisResult): Promise<SellerReport | null> {
  return reports.get(analysis) ?? null;
}
