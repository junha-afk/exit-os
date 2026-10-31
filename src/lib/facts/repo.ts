// 매장 정성 정보 저장소 (소유: A). facts 쓰기는 이 파일을 통해서만 한다. 서버에서만 호출.
// B는 getFacts 만 import 한다 (docs/TEAM_PLAN.md §4).
// 지금은 개발 서버 메모리에 보관하고 데모 매장은 목업으로 시작한다. 저장 방식(Supabase/메모리)이 정해지면 이 파일 안만 바꾼다.
import { MOCK_STORE_ID, mockFacts } from '@/lib/mocks';
import type { FactKey, StoreFacts } from '@/lib/types';

const store = new Map<string, StoreFacts>([[MOCK_STORE_ID, structuredClone(mockFacts)]]);

export async function getFacts(storeId: string): Promise<StoreFacts> {
  return store.get(storeId) ?? {};
}

// 점주 입력은 항상 사용자 입력(🔵). verified 판정은 B의 analysis/provenance.ts 만 한다.
export async function setFact(storeId: string, key: FactKey, value: unknown): Promise<void> {
  const facts = store.get(storeId) ?? {};
  facts[key] = { value, provenance: 'user_input' };
  store.set(storeId, facts);
}

// 데모는 매장 1개. 실제 id 발급은 저장 방식이 정해진 뒤에 바꾼다.
export async function createStore(input: { name: string; industry: string }): Promise<string> {
  await setFact(MOCK_STORE_ID, 'store_name', input.name);
  await setFact(MOCK_STORE_ID, 'industry', input.industry);
  return MOCK_STORE_ID;
}
