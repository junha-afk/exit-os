// 매장 정성 정보 저장소 (소유: A). facts 쓰기는 이 파일을 통해서만 한다. 서버에서만 호출.
// B는 getFacts 만 import 한다 (docs/TEAM_PLAN.md §4).
// 목업 매장의 초기 facts는 Supabase에 한 번만 복사하고 이후 저장·확인은 DB를 기준으로 한다.
import { MOCK_STORE_ID, mockFacts } from '@/lib/mocks';
import type { FactKey, Provenance, StoreFacts } from '@/lib/types';
import { ensureStoreExists, getSupabase, saveStoreMetadata } from '@/lib/supabase';

export async function getFacts(storeId: string): Promise<StoreFacts> {
  const isNewStore = await ensureStoreExists(storeId, { name: defaultStoreName(storeId) });
  if (isNewStore && storeId === MOCK_STORE_ID) await writeFacts(storeId, mockFacts);

  const { data, error } = await getSupabase()
    .from('store_facts')
    .select('key, value, provenance, note')
    .eq('store_id', storeId);
  if (error) throw new Error(`SUPABASE_FACTS_READ_FAILED: ${error.message}`);
  return Object.fromEntries(data.map((row) => [
    row.key,
    { value: row.value, provenance: row.provenance, ...(row.note ? { note: row.note } : {}) },
  ])) as StoreFacts;
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
  const { error } = await getSupabase()
    .from('store_facts')
    .update({ provenance: 'user_input', updated_at: new Date().toISOString() })
    .eq('store_id', storeId)
    .eq('key', key);
  if (error) throw new Error(`SUPABASE_FACT_CONFIRM_FAILED: ${error.message}`);
  return true;
}

async function setFactWithProvenance(storeId: string, key: FactKey, value: unknown, provenance: Provenance, note?: string) {
  await ensureStoreExists(storeId);
  const { error } = await getSupabase().from('store_facts').upsert({
    store_id: storeId,
    key,
    value,
    provenance,
    note: note ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'store_id,key' });
  if (error) throw new Error(`SUPABASE_FACT_SAVE_FAILED: ${error.message}`);
}

/** 진단을 처음부터 다시 (facts 비우기) */
export async function resetFacts(storeId: string): Promise<void> {
  await ensureStoreExists(storeId);
  const { error } = await getSupabase().from('store_facts').delete().eq('store_id', storeId);
  if (error) throw new Error(`SUPABASE_FACTS_RESET_FAILED: ${error.message}`);
}

// 데모 매장은 단일 고정 ID를 사용한다.
export async function createStore(input: { name: string; industry: string }): Promise<string> {
  const isNewStore = await ensureStoreExists(MOCK_STORE_ID, input);
  if (isNewStore) await writeFacts(MOCK_STORE_ID, mockFacts);
  await saveStoreMetadata({ id: MOCK_STORE_ID, name: input.name, industry: input.industry });
  await setFact(MOCK_STORE_ID, 'store_name', input.name);
  await setFact(MOCK_STORE_ID, 'industry', input.industry);
  return MOCK_STORE_ID;
}

async function writeFacts(storeId: string, facts: StoreFacts): Promise<void> {
  const rows = Object.entries(facts).flatMap(([key, fact]) => fact ? [{
    store_id: storeId,
    key,
    value: fact.value,
    provenance: fact.provenance,
    note: fact.note ?? null,
  }] : []);
  if (!rows.length) return;
  const { error } = await getSupabase().from('store_facts').upsert(rows, { onConflict: 'store_id,key' });
  if (error) throw new Error(`SUPABASE_MOCK_FACTS_SEED_FAILED: ${error.message}`);
}

function defaultStoreName(storeId: string): string {
  const mockName = mockFacts.store_name?.value;
  return storeId === MOCK_STORE_ID && typeof mockName === 'string' ? mockName : storeId;
}
