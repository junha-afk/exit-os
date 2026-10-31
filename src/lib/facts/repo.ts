// 매장 정성 정보 저장소 (소유: A). facts 쓰기는 이 파일을 통해서만 한다. 서버에서만 호출.
// B는 getFacts 만 import 한다 (docs/TEAM_PLAN.md §4).
// 지금은 서버 메모리에 보관한다(globalThis — Next 개발 서버에서 라우트·페이지가 같은 값을 보게).
// 데모 매장은 목업 facts 로 시작하고, 진단 화면의 "처음부터 다시"가 비운다. 저장 방식이 정해지면 이 파일 안만 바꾼다.
import { MOCK_STORE_ID, mockFacts } from '@/lib/mocks';
import type { FactKey, Provenance, StoreFacts } from '@/lib/types';

const g = globalThis as unknown as { __exitosFacts?: Map<string, StoreFacts> };
const store = (g.__exitosFacts ??= new Map<string, StoreFacts>([[MOCK_STORE_ID, structuredClone(mockFacts)]]));

export async function getFacts(storeId: string): Promise<StoreFacts> {
  return store.get(storeId) ?? {};
}

/** 점주가 입력 칸·패널에서 넣은 값 → 사용자 입력(🔵). verified 판정은 B의 analysis/provenance.ts 만 한다 */
export async function setFact(storeId: string, key: FactKey, value: unknown): Promise<void> {
  await setFactWithProvenance(storeId, key, value, 'user_input');
}

/** 자료에서 LLM이 읽은 값 → 확인 필요(🟠) + 근거. 점주가 이미 직접 넣은 값은 덮어쓰지 않는다 */
export async function setFactFromDocument(
  storeId: string, key: FactKey, value: unknown, note: string,
): Promise<'saved' | 'kept_user_input'> {
  const current = (await getFacts(storeId))[key];
  if (current?.provenance === 'user_input') return 'kept_user_input';
  await setFactWithProvenance(storeId, key, value, 'needs_check', note);
  return 'saved';
}

/** 자료에서 읽은 값을 점주가 "맞아요" → 사용자 입력(🔵) */
export async function confirmFact(storeId: string, key: FactKey): Promise<boolean> {
  const facts = await getFacts(storeId);
  const current = facts[key];
  if (!current) return false;
  facts[key] = { ...current, provenance: 'user_input' };
  return true;
}

async function setFactWithProvenance(storeId: string, key: FactKey, value: unknown, provenance: Provenance, note?: string) {
  const facts = store.get(storeId) ?? {};
  facts[key] = note ? { value, provenance, note } : { value, provenance };
  store.set(storeId, facts);
}

/** 진단을 처음부터 다시 (facts 비우기) */
export async function resetFacts(storeId: string): Promise<void> {
  store.set(storeId, {});
}

// 데모는 매장 1개. 실제 id 발급은 저장 방식이 정해진 뒤에 바꾼다.
export async function createStore(input: { name: string; industry: string }): Promise<string> {
  await setFact(MOCK_STORE_ID, 'store_name', input.name);
  await setFact(MOCK_STORE_ID, 'industry', input.industry);
  return MOCK_STORE_ID;
}
