// 보고서 저장소 (소유: B). 서버 메모리 — Supabase 로 옮길 때 이 파일 안만 바꾼다
import type { SellerReport } from './types';

const g = globalThis as typeof globalThis & { __exitosReports?: Map<string, SellerReport> };
const reports = (g.__exitosReports ??= new Map());

export async function saveSellerReport(storeId: string, report: SellerReport): Promise<void> {
  reports.set(storeId, report);
}

export async function getSellerReport(storeId: string): Promise<SellerReport | null> {
  return reports.get(storeId) ?? null;
}

// 재무 자료가 바뀌면 이전 보고서는 숫자가 맞지 않으므로 지운다
export async function clearSellerReport(storeId: string): Promise<void> {
  reports.delete(storeId);
}
