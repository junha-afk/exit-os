// 재무 자료 저장소 (소유: B). 서버에서만 호출. A는 getUploadedKinds 만 import 한다 (docs/TEAM_PLAN.md §4).
import type { RecordKind } from '@/lib/types';

// PR-0 스텁: 업로드 구현(B-1) 전까지 빈 목록
export async function getUploadedKinds(_storeId: string): Promise<RecordKind[]> {
  return [];
}
