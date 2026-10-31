// 자료 읽기 (소유: A). 서버 전용. 올라온 파일을 형식에 맞게 풀고 LLM이 읽게 한 뒤, facts·재무 행으로 저장한다.
// - 표(CSV): LLM은 열 매핑만, 모든 행은 코드가 읽는다
// - 표(엑셀): 첫 시트의 열 매핑은 LLM, 모든 행은 코드가 읽는다
// - PDF·Word·한글: 코드가 텍스트를 추출해 LLM이 읽는다
// - 사진: 이미지를 그대로 LLM에 보낸다
import { randomUUID } from 'node:crypto';
import * as XLSX from '@e965/xlsx';
import { hwpToText, HwpxReader } from '@ssabrojs/hwpxjs';
import Papa from 'papaparse';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import WordExtractor from 'word-extractor';
import { chatJson } from '@/lib/ai/llm';
import { setFactFromDocument } from '@/lib/facts/repo';
import { DOCUMENT_READ_SYSTEM_PROMPT, TABLE_MAPPING_SYSTEM_PROMPT, buildDocumentReadUserMessage, buildTableMappingUserMessage } from '@/lib/interview/prompts';
import { DocumentReadSchema, TableMappingSchema, type DocumentRead, type TableMapping } from '@/lib/interview/schemas';
import { SLOTS, SLOT_BY_KEY, parseSlotStored } from '@/lib/interview/slots';
import type { FactKey } from '@/lib/types';
import { DOC_KINDS, getDocKind, type DocKind, type DocKindSpec } from './catalog';
import { saveDocument } from './repo';
import type { FinancialRow, UploadedDocument } from './types';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 20_000;
const MAX_PDF_PAGES = 50;

export interface FilledFact { key: FactKey; label: string; display: string; evidence: string }
export interface ReadResult { document: UploadedDocument; filledFacts: FilledFact[]; recordCount: number }

export class UnsupportedFileError extends Error {}

type FileKind = 'table_csv' | 'table_excel' | 'image' | 'text' | 'pdf' | 'word' | 'hangul' | 'unknown';

function fileKindOf(name: string, mime: string): FileKind {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext)) return 'image';
  if (ext === 'csv' || mime === 'text/csv') return 'table_csv';
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (['xlsx', 'xls'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel')) return 'table_excel';
  if (['doc', 'docx'].includes(ext) || mime === 'application/msword' || mime.includes('wordprocessingml')) return 'word';
  if (['hwp', 'hwpx'].includes(ext) || mime.includes('hwp')) return 'hangul';
  if (mime.startsWith('text/') || ['txt', 'md', 'json', 'tsv'].includes(ext)) return 'text';
  return 'unknown';
}

const FACT_FORMATS = Object.fromEntries(SLOTS.map((s) => [s.key, s.format])) as Partial<Record<FactKey, string>>;
const CATALOG_FOR_READ = DOC_KINDS.map((d) => ({
  kind: d.kind, label: d.label, produces: d.produces,
  ...('factKeys' in d ? { factKeys: d.factKeys } : {}),
  ...('targetFields' in d ? { targetFields: d.targetFields } : {}),
}));
const RECORD_KINDS_FOR_MAP = (DOC_KINDS as readonly DocKindSpec[])
  .filter((d) => d.produces === 'records')
  .map((d) => ({ kind: d.kind as DocKind, label: d.label, targetFields: d.targetFields ?? [] }));

export async function readUploadedFile(storeId: string, requestedKind: DocKind, file: File): Promise<ReadResult> {
  const kind = fileKindOf(file.name, file.type);
  if (kind === 'unknown') {
    throw new UnsupportedFileError('지원하지 않는 파일이에요. PDF·Word·한글·엑셀·CSV·사진·텍스트로 올려주세요.');
  }

  if (kind === 'table_csv' || kind === 'table_excel') {
    const table = kind === 'table_csv' ? await readCsv(file) : await readExcel(file);
    if (table.headers.length && table.rows.length) {
      const mapping = await chatJson({
        system: TABLE_MAPPING_SYSTEM_PROMPT,
        user: buildTableMappingUserMessage({
          expected_kind: requestedKind, filename: file.name, sheet: table.sheet, headers: table.headers,
          sample_rows: table.rows.slice(0, 20), doc_catalog: RECORD_KINDS_FOR_MAP,
        }),
        schema: TableMappingSchema,
      });
      const spec = getDocKind(mapping.detected_kind);
      if (spec?.produces === 'records') {
        return saveTable(storeId, requestedKind, file, spec, mapping, table.rows);
      }
    }
    // 재무 표가 아니면(장비 목록 등) 텍스트 문서로 읽는다
    return readAsDocument(storeId, requestedKind, file, { text: table.text.slice(0, MAX_TEXT_CHARS) });
  }

  if (kind === 'image') {
    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type || 'image/jpeg';
    return readAsDocument(storeId, requestedKind, file, { text: '', images: [`data:${mime};base64,${buf.toString('base64')}`] });
  }

  const text = await extractDocumentText(kind, file);
  if (!text.trim()) {
    throw new UnsupportedFileError('문서에서 읽을 수 있는 글자를 찾지 못했어요. 스캔 PDF는 페이지를 사진으로 저장해 올려주세요.');
  }
  return readAsDocument(storeId, requestedKind, file, { text: text.slice(0, MAX_TEXT_CHARS) });
}

interface ParsedTable {
  headers: string[];
  rows: Record<string, string>[];
  text: string;
  sheet?: string;
}

async function readCsv(file: File): Promise<ParsedTable> {
  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: true });
  return {
    headers: (parsed.meta.fields ?? []).filter(Boolean),
    rows: parsed.data,
    text,
  };
}

async function readExcel(file: File): Promise<ParsedTable> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
  const sheet = workbook.SheetNames[0];
  if (!sheet) return { headers: [], rows: [], text: '' };

  const worksheet = workbook.Sheets[sheet];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, raw: false, defval: '', blankrows: false });
  const rawHeaders = matrix[0] ?? [];
  const headers = uniqueHeaders(rawHeaders.map((cell, index) => cellText(cell) || `열 ${index + 1}`));
  const rows = matrix.slice(1).map((cells) => Object.fromEntries(
    headers.map((header, index) => [header, cellText(cells[index])]),
  ));
  const text = matrix.map((row) => row.map(cellText).join('\t')).join('\n');
  return { headers, rows, text, sheet };
}

function uniqueHeaders(rawHeaders: string[]): string[] {
  const used = new Set<string>();
  return rawHeaders.map((header) => {
    let unique = header;
    let suffix = 2;
    while (used.has(unique)) unique = `${header} (${suffix++})`;
    used.add(unique);
    return unique;
  });
}

function cellText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

async function extractDocumentText(kind: Exclude<FileKind, 'table_csv' | 'table_excel' | 'image' | 'unknown'>, file: File): Promise<string> {
  if (kind === 'text') return file.text();
  const data = await file.arrayBuffer();

  if (kind === 'pdf') {
    const loadingTask = getDocument({ data: new Uint8Array(data), isEvalSupported: false });
    try {
      const pdf = await loadingTask.promise;
      if (pdf.numPages > MAX_PDF_PAGES) {
        throw new UnsupportedFileError(`PDF는 ${MAX_PDF_PAGES}쪽 이하로 나누어 올려주세요.`);
      }
      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
        if (pages.join('\n').length >= MAX_TEXT_CHARS) break;
      }
      return pages.join('\n');
    } finally {
      await loadingTask.destroy();
    }
  }

  if (kind === 'word') {
    const document = await new WordExtractor().extract(Buffer.from(data));
    return document.getBody();
  }

  if (file.name.toLowerCase().endsWith('.hwpx')) {
    const reader = new HwpxReader();
    await reader.loadFromArrayBuffer(data);
    return reader.extractText();
  }
  return hwpToText(new Uint8Array(data));
}

// ── 문서·사진: LLM이 옮겨 적음 ──

async function readAsDocument(
  storeId: string, requestedKind: DocKind, file: File, content: { text: string; images?: string[] },
): Promise<ReadResult> {
  const read = await chatJson({
    system: DOCUMENT_READ_SYSTEM_PROMPT,
    user: buildDocumentReadUserMessage({
      expected_kind: requestedKind, filename: file.name, mime: file.type || 'application/octet-stream',
      text: content.text, doc_catalog: CATALOG_FOR_READ, fact_formats: FACT_FORMATS,
    }),
    images: content.images,
    schema: DocumentReadSchema,
    thinking: true,
  });

  const detected = (getDocKind(read.detected_kind)?.kind ?? 'other') as DocKind;
  const docLabel = getDocKind(detected)?.label ?? '자료';
  const documentId = randomUUID();
  const filledFacts = await saveFactsFromRead(storeId, read, docLabel);
  const rows = recordsFromRead(storeId, documentId, detected, read);

  const document: UploadedDocument = {
    id: documentId, storeId, requestedKind, detectedKind: detected, filename: file.name, mime: file.type,
    readBy: 'llm_document', summary: read.summary, filledFacts: filledFacts.map((f) => f.key),
    recordCount: rows.length, unreadable: read.unreadable, notes: read.notes, uploadedAt: new Date().toISOString(),
  };
  await saveDocument(document, rows);
  return { document, filledFacts, recordCount: rows.length };
}

async function saveFactsFromRead(storeId: string, read: DocumentRead, docLabel: string): Promise<FilledFact[]> {
  const out: FilledFact[] = [];
  for (const f of read.facts) {
    const slot = SLOT_BY_KEY[f.key as FactKey];
    if (!slot) continue;
    let value = f.value;
    // 단위 환산은 코드가 한다
    if (typeof value === 'number' && f.unit) {
      if (slot.key === 'area_m2' && /평/.test(f.unit)) value = Math.round(value * 3.3058 * 10) / 10;
      else if (slot.input.type === 'money' && /만/.test(f.unit)) value = Math.round(value * 10_000);
      else if (slot.input.type === 'money' && /천/.test(f.unit)) value = Math.round(value * 1_000);
    }
    const checked = parseSlotStored(slot, value);
    if (!checked.ok) continue;
    const evidence = f.evidence.slice(0, 60);
    const saved = await setFactFromDocument(storeId, slot.key, checked.value, `${docLabel}: "${evidence}"`);
    if (saved === 'saved') out.push({ key: slot.key, label: slot.label, display: slot.display(checked.value), evidence });
  }
  return out;
}

function recordsFromRead(storeId: string, documentId: string, detected: DocKind, read: DocumentRead): FinancialRow[] {
  const spec = getDocKind(detected);
  if (spec?.produces !== 'records' || !spec.recordKind) return [];
  const rows: FinancialRow[] = [];
  for (const r of read.records) {
    const date = normalizeDate(r.date);
    if (!date) continue;
    const fields: FinancialRow['fields'] = {};
    for (const [k, v] of Object.entries(r.fields)) {
      fields[k] = typeof v === 'number' || typeof v === 'boolean' || v === null ? v : String(v);
    }
    rows.push({ storeId, documentId, kind: spec.recordKind, date, month: date.slice(0, 7), fields, readBy: 'llm_document' });
  }
  return rows;
}

// ── 표: LLM은 열 매핑만, 행은 코드가 읽음 ──

const NUMERIC_FIELDS = new Set(['amount', 'gross_sales', 'fees', 'net_payout', 'orders', 'hours', 'pay']);

async function saveTable(
  storeId: string, requestedKind: DocKind, file: File, spec: DocKindSpec, mapping: TableMapping, data: Record<string, string>[],
): Promise<ReadResult> {
  const documentId = randomUUID();
  const skip = mapping.skip_row_hint.filter(Boolean);
  const mult = mapping.amount_unit === 'thousand_won' ? 1000 : 1;
  const rows: FinancialRow[] = [];

  for (const r of data) {
    const cells = Object.values(r).map((v) => String(v ?? ''));
    if (skip.some((w) => cells.some((c) => c.trim() === w || c.includes(w)))) continue;

    let rawDate: string | undefined;
    if (mapping.column_map.date) rawDate = r[mapping.column_map.date];
    else if (mapping.date_parts) {
      const { year, month, day } = mapping.date_parts;
      rawDate = [r[year], r[month], day ? r[day] : undefined].filter(Boolean).join('-');
    }
    const date = normalizeDate(rawDate);
    if (!date) continue;

    const fields: FinancialRow['fields'] = {};
    for (const field of spec.targetFields ?? []) {
      if (field === 'date') continue;
      const col = mapping.column_map[field];
      if (!col) continue;
      const raw = String(r[col] ?? '').trim();
      if (NUMERIC_FIELDS.has(field)) {
        const n = Number(raw.replace(/[,\s원₩]/g, ''));
        fields[field] = Number.isFinite(n) ? Math.round(n * (field === 'orders' || field === 'hours' ? 1 : mult)) : null;
      } else if (field === 'channel') {
        fields[field] = mapping.channel_values[raw] ?? raw;
      } else {
        fields[field] = raw;
      }
    }
    rows.push({ storeId, documentId, kind: spec.recordKind as string, date, month: date.slice(0, 7), fields, readBy: 'code_table' });
  }

  const document: UploadedDocument = {
    id: documentId, storeId, requestedKind, detectedKind: spec.kind as DocKind, filename: file.name, mime: file.type,
    readBy: 'code_table', summary: mapping.summary || `${spec.label} ${rows.length}행`, filledFacts: [],
    recordCount: rows.length, unreadable: rows.length === 0, notes: mapping.notes, uploadedAt: new Date().toISOString(),
  };
  await saveDocument(document, rows);
  return { document, filledFacts: [], recordCount: rows.length };
}

/** '2026-08-01', '2026.08.01', '2026/8/1', '2026-08', '20260801', '2026년 8월' → 'YYYY-MM-DD' 또는 'YYYY-MM' */
export function normalizeDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/(\d{4})\s*[-./년]\s*(\d{1,2})(?:\s*[-./월]\s*(\d{1,2}))?/);
  if (!m) return null;
  const mm = m[2].padStart(2, '0');
  if (Number(mm) < 1 || Number(mm) > 12) return null;
  return m[3] ? `${m[1]}-${mm}-${m[3].padStart(2, '0')}` : `${m[1]}-${mm}`;
}
