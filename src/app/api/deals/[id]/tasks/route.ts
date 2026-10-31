import { NextResponse } from 'next/server';
import { summarizeTasks } from '@/lib/handover/progress';
import { mockTasks } from '@/lib/mocks';

// GET /api/deals/:id/tasks → { tasks, progress, byStage, nextUp }  (목업 데이터, 집계는 실제)
export async function GET() {
  return NextResponse.json(summarizeTasks(mockTasks));
}
