import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DOC_KIND_IDS, getDocKind, type DocKind } from '@/lib/documents/catalog';
import { declineDocument } from '@/lib/documents/repo';
import { getInterviewState } from '@/lib/interview/state';

// 소유: A. POST /api/stores/:id/documents/decline { kind } — "이 자료는 없어요". 같은 자료를 다시 요청하지 않는다.
const Body = z.object({ kind: z.enum(DOC_KIND_IDS as [DocKind, ...DocKind[]]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '알 수 없는 자료 종류입니다.' }, { status: 400 });
  await declineDocument(id, parsed.data.kind);
  getInterviewState(id).history.push({ kind: 'declined', label: getDocKind(parsed.data.kind)?.label ?? '자료' });
  return NextResponse.json({ ok: true });
}
