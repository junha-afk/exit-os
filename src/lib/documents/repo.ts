// 자료·재무 행 저장소 (소유: A). B는 listDocuments·getFinancialRows 만 import 한다 (docs/TEAM_PLAN.md §4). 서버에서만 호출.
// 지금은 서버 메모리(globalThis). 저장 방식이 정해지면 이 파일 안만 바꾼다.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import type { DocKind } from './catalog';
import type { DocumentRequestState, FinancialRow, UploadedDocument } from './types';

interface StoreDocs {
  documents: UploadedDocument[];
  rows: FinancialRow[];
  states: DocumentRequestState[];
}

const g = globalThis as unknown as { __exitosDocs?: Map<string, StoreDocs> };
const store = (g.__exitosDocs ??= new Map<string, StoreDocs>());

function docsOf(storeId: string): StoreDocs {
  let d = store.get(storeId);
  if (!d) store.set(storeId, (d = { documents: [], rows: [], states: [] }));
  return d;
}

// ── B가 읽는 함수 ──

export async function listDocuments(storeId: string): Promise<UploadedDocument[]> {
  return docsOf(storeId).documents;
}

/**
 * 모든 재무 자료의 표준 행. 정리·중복 제거·월 합계는 B가 한다.
 * 아직 재무 자료가 하나도 안 올라왔으면 data/sample CSV 를 읽은 행을 준다(B가 A를 기다리지 않고 개발하도록).
 */
export async function getFinancialRows(storeId: string): Promise<FinancialRow[]> {
  const rows = docsOf(storeId).rows;
  return rows.length ? rows : sampleRows(storeId);
}

// ── A 내부 ──

export async function getDocumentStates(storeId: string): Promise<DocumentRequestState[]> {
  return docsOf(storeId).states;
}

export async function saveDocument(doc: UploadedDocument, rows: FinancialRow[]): Promise<void> {
  const d = docsOf(doc.storeId);
  d.documents.push(doc);
  d.rows.push(...rows);
  for (const kind of new Set<DocKind>([doc.requestedKind, doc.detectedKind])) {
    setState(d, { kind, status: 'received', summary: doc.summary });
  }
}

export async function markRequested(storeId: string, kind: DocKind): Promise<void> {
  const d = docsOf(storeId);
  if (!d.states.some((s) => s.kind === kind)) d.states.push({ kind, status: 'requested' });
}

export async function declineDocument(storeId: string, kind: DocKind): Promise<void> {
  setState(docsOf(storeId), { kind, status: 'declined' });
}

export async function resetDocuments(storeId: string): Promise<void> {
  store.set(storeId, { documents: [], rows: [], states: [] });
}

function setState(d: StoreDocs, next: DocumentRequestState) {
  const i = d.states.findIndex((s) => s.kind === next.kind);
  if (i >= 0) d.states[i] = next;
  else d.states.push(next);
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
