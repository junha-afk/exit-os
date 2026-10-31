import { NextResponse } from 'next/server';
import { z } from 'zod';
import { updateTaskStatus } from '@/lib/handover/repo';

const Body = z.object({ status: z.enum(['todo', 'doing', 'done', 'blocked']) });

// PATCH /api/tasks/:id → { ok }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '상태 값이 올바르지 않습니다.' }, { status: 400 });
  if (!(await updateTaskStatus(id, parsed.data.status))) {
    return NextResponse.json({ error: '업무를 찾을 수 없습니다.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
