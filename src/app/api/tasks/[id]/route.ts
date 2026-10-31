import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mockTasks } from '@/lib/mocks';

const Body = z.object({ status: z.enum(['todo', 'doing', 'done', 'blocked']) });

// PATCH /api/tasks/:id → { ok }  (목업: 개발 서버 메모리에만 반영)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '상태 값이 올바르지 않습니다.' }, { status: 400 });
  const task = mockTasks.find((t) => t.id === id);
  if (!task) return NextResponse.json({ error: '업무를 찾을 수 없습니다.' }, { status: 404 });
  task.status = parsed.data.status;
  return NextResponse.json({ ok: true });
}
