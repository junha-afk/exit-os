import { NextResponse } from 'next/server';
import { forbidOtherStore } from '@/lib/store-session';
import { DOC_KIND_IDS, getDocKind, type DocKind } from '@/lib/documents/catalog';
import { MAX_UPLOAD_BYTES, UnsupportedFileError, readUploadedFile } from '@/lib/documents/read';
import { getFacts } from '@/lib/facts/repo';
import { getInterviewState } from '@/lib/interview/state';

// 소유: A. POST /api/stores/:id/upload (multipart: file, requestedKind)
// 아무 형식의 자료 1건을 받아 LLM이 읽게 하고 facts·재무 행으로 저장한다.
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = forbidOtherStore(req, id);
  if (denied) return denied;
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const requested = String(form?.get('requestedKind') ?? 'other');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: '파일을 올려주세요.' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: '10MB 이하 파일만 올릴 수 있어요.' }, { status: 400 });
  }
  const requestedKind = (DOC_KIND_IDS as string[]).includes(requested) ? (requested as DocKind) : 'other';

  try {
    const result = await readUploadedFile(id, requestedKind, file);
    const { document, filledFacts, recordCount } = result;
    getInterviewState(id).history.push({
      kind: 'document', label: getDocKind(document.detectedKind)?.label ?? '자료',
      filename: document.filename, summary: document.summary,
      filled: filledFacts.map((f) => `${f.label} ${f.display}`), recordCount, unreadable: document.unreadable,
    });
    return NextResponse.json({ ...result, facts: await getFacts(id) });
  } catch (e) {
    if (e instanceof UnsupportedFileError) return NextResponse.json({ error: e.message }, { status: 415 });
    return NextResponse.json({ error: '자료를 읽지 못했어요. 잠시 후 다시 올리거나 다른 파일(사진 등)로 올려주세요.' }, { status: 502 });
  }
}
