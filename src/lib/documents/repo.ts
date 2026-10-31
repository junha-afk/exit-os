// 자료·재무 행 저장소 (소유: A). B는 listDocuments·getFinancialRows 만 import 한다 (docs/TEAM_PLAN.md §4). 서버에서만 호출.
// 업로드 자료·재무 행·자료 요청 상태는 Supabase에 저장한다.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import { ensureStoreExists, getSupabase } from '@/lib/supabase';
import type { DocKind } from './catalog';
import type { DocumentRequestState, FinancialRow, UploadedDocument } from './types';

interface DocumentRow {
  id: string;
  store_id: string;
  requested_kind: string;
  detected_kind: string;
  filename: string;
  mime: string;
  read_by: UploadedDocument['readBy'];
  summary: string;
  filled_facts: string[];
  record_count: number;
  unreadable: boolean;
  notes: string[];
  uploaded_at: string;
}

interface FinancialRecordRow {
  store_id: string;
  document_id: string;
  kind: string;
  date: string;
  month: string;
  fields: FinancialRow['fields'];
  read_by: FinancialRow['readBy'];
}

// ── B가 읽는 함수 ──

export async function listDocuments(storeId: string): Promise<UploadedDocument[]> {
  const { data, error } = await getSupabase()
    .from('uploaded_documents')
    .select('id, store_id, requested_kind, detected_kind, filename, mime, read_by, summary, filled_facts, record_count, unreadable, notes, uploaded_at')
    .eq('store_id', storeId)
    .order('uploaded_at', { ascending: true });
  if (error) throw new Error(`SUPABASE_DOCUMENTS_READ_FAILED: ${error.message}`);
  return data.map(mapDocument);
}

/**
 * 모든 재무 자료의 표준 행. 정리·중복 제거·월 합계는 B가 한다.
 * 아직 재무 자료가 하나도 안 올라왔으면 data/sample CSV 를 읽은 행을 준다(B가 A를 기다리지 않고 개발하도록).
 */
export async function getFinancialRows(storeId: string): Promise<FinancialRow[]> {
  const { data, error } = await getSupabase()
    .from('financial_records')
    .select('store_id, document_id, kind, date, month, fields, read_by')
    .eq('store_id', storeId)
    .order('month', { ascending: true });
  if (error) throw new Error(`SUPABASE_FINANCIAL_ROWS_READ_FAILED: ${error.message}`);
  return data.length ? data.map(mapFinancialRow) : sampleRows(storeId);
}

// ── A 내부 ──

export async function getDocumentStates(storeId: string): Promise<DocumentRequestState[]> {
  const { data, error } = await getSupabase()
    .from('document_request_states')
    .select('kind, status, summary')
    .eq('store_id', storeId);
  if (error) throw new Error(`SUPABASE_DOCUMENT_STATES_READ_FAILED: ${error.message}`);
  return data.map((row) => ({
    kind: row.kind as DocKind,
    status: row.status as DocumentRequestState['status'],
    ...(row.summary ? { summary: row.summary } : {}),
  }));
}

export async function saveDocument(doc: UploadedDocument, rows: FinancialRow[]): Promise<void> {
  await ensureStoreExists(doc.storeId);
  const { error: documentError } = await getSupabase().from('uploaded_documents').insert(toDocumentRow(doc));
  if (documentError) throw new Error(`SUPABASE_DOCUMENT_SAVE_FAILED: ${documentError.message}`);

  if (rows.length) {
    const { error: rowsError } = await getSupabase().from('financial_records').insert(rows.map(toFinancialRecordRow));
    if (rowsError) {
      const { error: rollbackError } = await getSupabase()
        .from('uploaded_documents')
        .delete()
        .eq('id', doc.id);
      if (rollbackError) {
        throw new Error(`SUPABASE_FINANCIAL_ROWS_SAVE_FAILED: ${rowsError.message}; document rollback failed: ${rollbackError.message}`);
      }
      throw new Error(`SUPABASE_FINANCIAL_ROWS_SAVE_FAILED: ${rowsError.message}`);
    }
  }

  const kinds = new Set<DocKind>([doc.requestedKind, doc.detectedKind]);
  const { error: stateError } = await getSupabase().from('document_request_states').upsert(
    [...kinds].map((kind) => ({
      store_id: doc.storeId,
      kind,
      status: 'received',
      summary: doc.summary,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'store_id,kind' },
  );
  if (stateError) throw new Error(`SUPABASE_DOCUMENT_STATE_SAVE_FAILED: ${stateError.message}`);
}

export async function markRequested(storeId: string, kind: DocKind): Promise<void> {
  await ensureStoreExists(storeId);
  const { data, error } = await getSupabase()
    .from('document_request_states')
    .select('status')
    .eq('store_id', storeId)
    .eq('kind', kind)
    .maybeSingle();
  if (error) throw new Error(`SUPABASE_DOCUMENT_STATE_LOOKUP_FAILED: ${error.message}`);
  if (data) return;

  const { error: insertError } = await getSupabase().from('document_request_states').insert({
    store_id: storeId,
    kind,
    status: 'requested',
  });
  if (insertError?.code === '23505') return;
  if (insertError) throw new Error(`SUPABASE_DOCUMENT_REQUEST_SAVE_FAILED: ${insertError.message}`);
}

export async function declineDocument(storeId: string, kind: DocKind): Promise<void> {
  await ensureStoreExists(storeId);
  const { error } = await getSupabase().from('document_request_states').upsert({
    store_id: storeId,
    kind,
    status: 'declined',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'store_id,kind' });
  if (error) throw new Error(`SUPABASE_DOCUMENT_DECLINE_SAVE_FAILED: ${error.message}`);
}

export async function resetDocuments(storeId: string): Promise<void> {
  const { error: documentsError } = await getSupabase().from('uploaded_documents').delete().eq('store_id', storeId);
  if (documentsError) throw new Error(`SUPABASE_DOCUMENTS_RESET_FAILED: ${documentsError.message}`);
  const { error: statesError } = await getSupabase().from('document_request_states').delete().eq('store_id', storeId);
  if (statesError) throw new Error(`SUPABASE_DOCUMENT_STATES_RESET_FAILED: ${statesError.message}`);
}

function mapDocument(row: DocumentRow): UploadedDocument {
  return {
    id: row.id,
    storeId: row.store_id,
    requestedKind: row.requested_kind as DocKind,
    detectedKind: row.detected_kind as DocKind,
    filename: row.filename,
    mime: row.mime,
    readBy: row.read_by,
    summary: row.summary,
    filledFacts: row.filled_facts,
    recordCount: row.record_count,
    unreadable: row.unreadable,
    notes: row.notes,
    uploadedAt: row.uploaded_at,
  };
}

function mapFinancialRow(row: FinancialRecordRow): FinancialRow {
  return {
    storeId: row.store_id,
    documentId: row.document_id,
    kind: row.kind,
    date: row.date,
    month: row.month,
    fields: row.fields,
    readBy: row.read_by,
  };
}

function toDocumentRow(doc: UploadedDocument): DocumentRow {
  return {
    id: doc.id,
    store_id: doc.storeId,
    requested_kind: doc.requestedKind,
    detected_kind: doc.detectedKind,
    filename: doc.filename,
    mime: doc.mime,
    read_by: doc.readBy,
    summary: doc.summary,
    filled_facts: doc.filledFacts,
    record_count: doc.recordCount,
    unreadable: doc.unreadable,
    notes: doc.notes,
    uploaded_at: doc.uploadedAt,
  };
}

function toFinancialRecordRow(row: FinancialRow) {
  return {
    store_id: row.storeId,
    document_id: row.documentId,
    kind: row.kind,
    date: row.date,
    month: row.month,
    fields: row.fields,
    read_by: row.readBy,
  };
}

// ── 샘플 재무 행 (data/sample) ──

const SAMPLE_FILES: { kind: string; file: string; categoryField?: string }[] = [
  { kind: 'pos', file: 'pos_sales.csv' },
  { kind: 'card_settlement', file: 'card_settlement.csv' },
  { kind: 'delivery', file: 'delivery_settlement.csv' },
  { kind: 'purchases', file: 'purchases.csv' },
  { kind: 'fixed', file: 'fixed_costs.csv' },
  { kind: 'payroll', file: 'payroll.csv' },
];
const NUMERIC = new Set(['amount', 'gross_sales', 'fees', 'net_payout', 'orders', 'hours', 'pay']);

function sampleRows(storeId: string): FinancialRow[] {
  const out: FinancialRow[] = [];
  for (const { kind, file } of SAMPLE_FILES) {
    let text: string;
    try {
      text = readFileSync(path.join(process.cwd(), 'data/sample', file), 'utf8');
    } catch {
      continue;
    }
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    for (const r of parsed.data) {
      const fields: FinancialRow['fields'] = {};
      for (const [k, v] of Object.entries(r)) {
        if (k === 'month') continue;
        fields[k] = NUMERIC.has(k) ? Number(v) : v;
      }
      out.push({ storeId, documentId: `sample:${file}`, kind, date: r.month, month: r.month, fields, readBy: 'code_table' });
    }
  }
  return out;
}
