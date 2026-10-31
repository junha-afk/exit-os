import { NextResponse } from 'next/server';
import { z } from 'zod';
import { RECORD_KINDS, type UploadResult } from '@/lib/types';
import { isIncludedInPos } from '@/lib/analysis/dedupe';
import { parseFinancialCsv } from '@/lib/analysis/parse';
import { replaceRecords } from '@/lib/analysis/repo';

const Kind = z.enum(RECORD_KINDS);
const MAX_BYTES = 2 * 1024 * 1024;

// POST /api/stores/:id/upload (multipart: kind, file) → UploadResult
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await req.formData().catch(() => null);
  const kind = Kind.safeParse(form?.get('kind'));
  const file = form?.get('file');
  if (!kind.success || !(file instanceof File)) {
    return NextResponse.json({ error: '자료 종류(kind)와 CSV 파일이 필요합니다.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'CSV 파일은 2MB 이하만 올릴 수 있습니다.' }, { status: 400 });

  const parsed = parseFinancialCsv(kind.data, await file.text());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  await replaceRecords(id, kind.data, parsed.records);
  const inPos = parsed.records.filter(isIncludedInPos);
  const warnings = [...parsed.warnings];
  if (inPos.length) {
    const months = [...new Set(inPos.map((r) => r.month))].sort();
    warnings.push(`${months[0]}~${months.at(-1)} 배달 매출이 POS에 포함되어 ${inPos.length}건 중복 제거`);
  }
  const result: UploadResult = { rows: parsed.records.length, dedupedRows: parsed.duplicates + inPos.length, warnings };
  return NextResponse.json(result);
}
