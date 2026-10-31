// 거래·인수인계 업무 저장소 (소유: B). 서버 메모리 — Supabase 로 옮길 때 이 파일 안만 바꾼다
// 데모 거래(MOCK_DEAL_ID)로 시작한다. 같은 매물에 거래 성사를 다시 누르면 같은 거래의 업무를 새로 만든다
import { MOCK_DEAL_ID, MOCK_LISTING_ID, mockTasks } from '@/lib/mocks';
import type { HandoverTask } from '@/lib/types';

interface Deal { id: string; listingId: string; tasks: HandoverTask[] }

const g = globalThis as typeof globalThis & { __exitosDeals?: Map<string, Deal> };
const deals = (g.__exitosDeals ??= new Map([
  [MOCK_DEAL_ID, { id: MOCK_DEAL_ID, listingId: MOCK_LISTING_ID, tasks: structuredClone(mockTasks) }],
]));

export async function getDealByListing(listingId: string): Promise<Deal | null> {
  return [...deals.values()].find((d) => d.listingId === listingId) ?? null;
}

export function newDealId(): string {
  return `deal-${crypto.randomUUID().slice(0, 8)}`;
}

export async function saveDeal(deal: Deal): Promise<void> {
  deals.set(deal.id, deal);
}

export async function getTasks(dealId: string): Promise<HandoverTask[] | null> {
  return deals.get(dealId)?.tasks ?? null;
}

export async function updateTaskStatus(taskId: string, status: HandoverTask['status']): Promise<boolean> {
  for (const deal of deals.values()) {
    const task = deal.tasks.find((t) => t.id === taskId);
    if (task) { task.status = status; return true; }
  }
  return false;
}
