// Supabase 서버 클라이언트 (소유: B). 서버 코드에서만 import 한다 — service role 키는 클라이언트에 노출 금지.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_NOT_CONFIGURED');
  if (!isServerKey(key)) throw new Error('SUPABASE_SERVICE_ROLE_KEY_INVALID');
  client ??= createClient(url, key, { auth: { persistSession: false } });
  return client;
}

function isServerKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  const [, payload] = key.split('.');
  if (!payload) return false;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { role?: unknown };
    return claims.role === 'service_role';
  } catch {
    return false;
  }
}

export async function ensureStoreExists(
  storeId: string,
  defaults: { name?: string; industry?: string } = {},
): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('stores').select('id').eq('id', storeId).maybeSingle();
  if (error) throw new Error(`SUPABASE_STORE_LOOKUP_FAILED: ${error.message}`);
  if (data) return false;

  const { error: insertError } = await supabase.from('stores').insert({
    id: storeId,
    name: defaults.name ?? storeId,
    industry: defaults.industry ?? null,
  });
  if (insertError?.code === '23505') return false;
  if (insertError) throw new Error(`SUPABASE_STORE_CREATE_FAILED: ${insertError.message}`);
  return true;
}

export async function saveStoreMetadata(input: { id: string; name: string; industry: string }): Promise<void> {
  const { error } = await getSupabase().from('stores').upsert({
    id: input.id,
    name: input.name,
    industry: input.industry,
  }, { onConflict: 'id' });
  if (error) throw new Error(`SUPABASE_STORE_SAVE_FAILED: ${error.message}`);
}
