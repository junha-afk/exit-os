// Supabase 서버 클라이언트 (소유: B). 서버 코드에서만 import 한다 — service role 키는 클라이언트에 노출 금지.
// 지금 저장소는 메모리(docs/TEAM_PLAN.md §12 결정 로그). Supabase로 옮길 때 각 repo.ts 가 이 함수를 쓴다.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_NOT_CONFIGURED');
  client ??= createClient(url, key, { auth: { persistSession: false } });
  return client;
}
