// 중복 제거 규칙 (소유: B). SKILL.md §2
import { createHash } from 'node:crypto';
import type { FinancialRecord } from './parse';

// 같은 키는 1건만 남긴다
export function dedupeKey(sourceGroup: string, month: string, channel: string, amount: number): string {
  return createHash('sha1').update(`${sourceGroup}|${month}|${channel}|${amount}`).digest('hex');
}

// 배달 정산 중 POS에 이미 포함된 행 (included_in_pos = 'Y') → 월매출 합산에서 뺀다
export const isIncludedInPos = (r: FinancialRecord) => r.kind === 'delivery' && r.extra.included_in_pos === 'Y';
