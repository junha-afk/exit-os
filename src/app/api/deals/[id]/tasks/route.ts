import { NextResponse } from 'next/server';
import { summarizeTasks } from '@/lib/handover/progress';
import { getTasks } from '@/lib/handover/repo';

// GET /api/deals/:id/tasks → { tasks, progress, byStage, nextUp }
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tasks = await getTasks(id);
  if (!tasks) return NextResponse.json({ error: '거래를 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json(summarizeTasks(tasks));
}
