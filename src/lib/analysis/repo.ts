// 분석 결과 저장소 (소유: B). 서버에서만 호출. 재무 행 원본은 A의 documents/repo.ts 가 갖고 B는 읽기만 한다.
// 지금은 서버 메모리(결정 로그). Supabase로 옮길 때 이 파일 안만 바꾼다.
import type { AnalysisResult } from '@/lib/types';

// globalThis 에 둬서 개발 서버의 모듈 재로드(HMR) 뒤에도 유지되게 한다
// signature = 분석에 쓴 재무 행·facts 의 해시. 같으면 다시 계산·LLM 호출하지 않는다
const g = globalThis as typeof globalThis & {
  __exitosAnalyses?: Map<string, { signature: string; result: AnalysisResult }>;
};
const analyses = (g.__exitosAnalyses ??= new Map());

export async function saveAnalysis(result: AnalysisResult, signature: string): Promise<void> {
  analyses.set(result.storeId, { signature, result });
}

export async function getAnalysis(storeId: string, signature: string): Promise<AnalysisResult | null> {
  const hit = analyses.get(storeId);
  return hit?.signature === signature ? hit.result : null;
}
