// 인수인계 업무 문구 보강 (소유: B). docs/AI_PROMPTS.md §6
// LLM 은 각 업무의 description(1문장)·checklist(2~4개)만 바꾼다. 업무 추가·순서·stage 변경 금지
import { z } from 'zod';
import { chatJson } from '@/lib/ai/llm';
import type { HandoverTask } from '@/lib/types';

export const enrichSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    description: z.string().min(1).max(200),
    checklist: z.array(z.string().min(1).max(80)).min(2).max(4),
  })),
});
export type EnrichResult = z.infer<typeof enrichSchema>;

export const ENRICH_SYSTEM = [
  '당신은 소상공인 매장 인수인계를 돕는 보조자입니다.',
  '각 업무에 description(1문장)과 checklist(2~4개)를 쓰세요. 업무를 추가하거나 순서·stage 를 바꾸지 마세요.',
  '법률 판단은 하지 말고 필요하면 "전문가 확인 권장"이라고 쓰세요. 존댓말, 한국어. 출력 형식: {"items":[{"id","description","checklist"}]}',
].join('\n');

export const enrichUserPrompt = (tasks: HandoverTask[], industry: string) =>
  JSON.stringify({ industry, tasks: tasks.map(({ id, title, category, stage }) => ({ id, title, category, stage })) });

// 모르는 id 는 버리고, 규칙이 만든 업무 목록·순서·상태는 그대로 둔다
export function applyEnrichment(tasks: HandoverTask[], result: EnrichResult | null): HandoverTask[] {
  const byId = new Map(result?.items.map((i) => [i.id, i]) ?? []);
  return tasks.map((t) => {
    const e = byId.get(t.id);
    return e ? { ...t, description: e.description, checklist: e.checklist } : t;
  });
}

// 업무가 30개 가까이라 출력이 길다. DEMO_MODE 에서는 빈 결과 → 규칙이 만든 문구 그대로
export async function enrichTasks(tasks: HandoverTask[], industry: string): Promise<HandoverTask[]> {
  const result = await chatJson({
    system: ENRICH_SYSTEM, user: enrichUserPrompt(tasks, industry), schema: enrichSchema,
    fixture: { items: [] }, maxTokens: 6000, timeoutMs: 30_000,
  }).catch(() => null);
  return applyEnrichment(tasks, result);
}
