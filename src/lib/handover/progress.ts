import { HANDOVER_STAGES, type DealTasksResponse, type HandoverTask } from '../types';

// 진행률 = done ÷ 전체(가중치 동일). 지금 할 일 = dependsOn 이 모두 done 이고 status ≠ done
export function summarizeTasks(tasks: HandoverTask[]): DealTasksResponse {
  const done = new Set(tasks.filter((t) => t.status === 'done').map((t) => t.id));
  return {
    tasks,
    progress: tasks.length ? done.size / tasks.length : 0,
    byStage: HANDOVER_STAGES.map(({ stage }) => {
      const inStage = tasks.filter((t) => t.stage === stage);
      return { stage, total: inStage.length, done: inStage.filter((t) => done.has(t.id)).length };
    }),
    nextUp: tasks.filter((t) => t.status !== 'done' && t.dependsOn.every((id) => done.has(id))),
  };
}
