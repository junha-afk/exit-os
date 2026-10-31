import { NextResponse } from 'next/server';
import { z } from 'zod';
import { RECORD_KINDS } from '@/lib/types';
import { mockUploadResults } from '@/lib/mocks';

const Kind = z.enum(RECORD_KINDS);

// POST /api/stores/:id/upload (multipart: kind, file) → { rows, dedupedRows, warnings }  (목업)
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const kind = Kind.safeParse(form?.get('kind'));
  if (!kind.success || !(form?.get('file') instanceof File)) {
    return NextResponse.json({ error: '자료 종류(kind)와 CSV 파일이 필요합니다.' }, { status: 400 });
  }
  return NextResponse.json(mockUploadResults[kind.data]);
}
