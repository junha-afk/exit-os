// 재무 자료 저장소 (소유: B). 서버에서만 호출. A는 getUploadedKinds 만 import 한다 (docs/TEAM_PLAN.md §4).
// 지금은 서버 메모리(결정 로그). Supabase로 옮길 때 이 파일 안만 바꾼다.
import type { AnalysisResult, RecordKind } from '@/lib/types';
import type { FinancialRecord } from './parse';

// globalThis 에 둬서 개발 서버의 모듈 재로드(HMR) 뒤에도 유지되게 한다
const g = globalThis as typeof globalThis & {
  __exitosRecords?: Map<string, Map<RecordKind, FinancialRecord[]>>;
  __exitosAnalyses?: Map<string, AnalysisResult>;
};
const records = (g.__exitosRecords ??= new Map());
const analyses = (g.__exitosAnalyses ??= new Map());

export async function getUploadedKinds(storeId: string): Promise<RecordKind[]> {
  return [...(records.get(storeId)?.keys() ?? [])];
}

// 같은 종류를 다시 올리면 통째로 바꾼다 (두 번 올려도 이중 집계되지 않게)
export async function replaceRecords(storeId: string, kind: RecordKind, rows: FinancialRecord[]): Promise<void> {
  const byKind = records.get(storeId) ?? new Map<RecordKind, FinancialRecord[]>();
  byKind.set(kind, rows);
  records.set(storeId, byKind);
}

export async function getRecords(storeId: string): Promise<FinancialRecord[]> {
  return [...(records.get(storeId)?.values() ?? [])].flat();
}

export async function saveAnalysis(result: AnalysisResult): Promise<void> {
  analyses.set(result.storeId, result);
}

export async function getAnalysis(storeId: string): Promise<AnalysisResult | null> {
  return analyses.get(storeId) ?? null;
}
