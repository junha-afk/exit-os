// 출처 판정 (소유: B). verified 는 이 파일만 부여한다 — LLM·사용자 입력은 절대 verified 가 아니다. SKILL.md §1-1
import type { Provenance } from '@/lib/types';

const RANK: Record<Provenance, number> = { needs_check: 0, user_input: 1, verified: 2 };

// 집계값의 출처 = 구성 요소 중 가장 낮은 신뢰도
export function lowest(...ps: Provenance[]): Provenance {
  return ps.reduce((a, b) => (RANK[a] <= RANK[b] ? a : b), 'verified');
}

export const MATCH_TOLERANCE = 0.03;

export function mismatchRatio(a: number, b: number): number {
  const base = Math.max(a, b);
  return base === 0 ? 0 : Math.abs(a - b) / base;
}

// 독립 출처 두 개가 ±3% 안이면 verified, 아니면 needs_check. 대조 출처가 없으면 user_input
export function crossCheck(primary: number, independent: number | null): Provenance {
  if (independent === null) return 'user_input';
  return mismatchRatio(primary, independent) <= MATCH_TOLERANCE ? 'verified' : 'needs_check';
}
