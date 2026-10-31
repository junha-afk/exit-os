// 중복 제거 규칙 (소유: B). SKILL.md §2
// 같은 자료를 다시 올린 경우는 parse.ts 가 종류·월별로 마지막 자료만 남겨 처리한다
import type { FinancialRecord } from './parse';

// 배달 정산 중 POS에 이미 포함된 행 (included_in_pos = 'Y') → 월매출 합산에서 뺀다
export const isIncludedInPos = (r: FinancialRecord) => r.kind === 'delivery' && r.extra.included_in_pos === 'Y';
