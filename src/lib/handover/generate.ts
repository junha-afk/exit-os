// 인수인계 업무 생성 — 결정론 규칙 (소유: B). SKILL.md §5. LLM 은 enrich.ts 에서 문구만 보강한다
import { factsView, monthsBetween } from '@/lib/report/facts';
import type { HandoverTask, StoreFacts } from '@/lib/types';

// 영업신고 지위승계가 필요한 업종 (식품위생법 영업)
const FOOD_INDUSTRIES = ['카페', '음식점', '베이커리', '주점', '분식'];

const ACCOUNT_KIND_LABEL = { delivery: '배달앱', pos: 'POS', sns: 'SNS', map: '지도', other: '계정' } as const;

// 거래 성사 시점 = 양도 준비·가치 산정·양수자 탐색은 ExitOS 에서 이미 끝난 단계
export function generateHandoverTasks(dealId: string, facts: StoreFacts, asOfMonth: string): HandoverTask[] {
  const v = factsView(facts);
  const tasks: HandoverTask[] = [];
  const add = (t: Omit<HandoverTask, 'id' | 'dealId' | 'status' | 'priority' | 'dependsOn'> & Partial<HandoverTask>) => {
    const id = `${dealId}-t${String(tasks.length + 1).padStart(2, '0')}`;
    tasks.push({ id, dealId, status: 'todo', priority: 'normal', dependsOn: [], ...t });
    return id;
  };

  const prep = add({ stage: 'prep', category: 'admin', title: '양도 준비: 매각 자료 정리', owner: 'seller', status: 'done' });
  const valuation = add({ stage: 'valuation', category: 'admin', title: '가치 산정: 매각 보고서 확정', owner: 'seller', status: 'done', dependsOn: [prep] });
  const buyer = add({ stage: 'buyer_search', category: 'admin', title: '양수자 확정', owner: 'seller', status: 'done', dependsOn: [valuation] });
  const dueDiligence = add({
    stage: 'due_diligence', category: 'admin', title: '실사: 확인 필요 항목 증빙 제출', owner: 'both', dependsOn: [buyer],
    checklist: ['매출 증빙(카드사 정산·현금영수증·통장 입금 내역)', '원재료 매입 명세', '임대차계약서'],
  });

  const leaseLeft = v.leaseExpiry ? monthsBetween(asOfMonth, v.leaseExpiry) : null;
  const leaseSoon = leaseLeft !== null && leaseLeft <= 12;
  const landlord = add({
    stage: 'landlord', category: 'contract', owner: 'seller', dependsOn: [dueDiligence],
    ...(leaseSoon
      ? { title: '임대인 갱신 협의', priority: 'high' as const, description: `임대차 만료 ${v.leaseExpiry} (12개월 이내)` }
      : { title: '임대인에게 양도 사실 알리고 계약 승계 협의' }),
  });
  const premium = add({ stage: 'premium_contract', category: 'contract', title: '권리금 계약 체결', owner: 'both', priority: 'high', dependsOn: [landlord] });
  const lease = add({ stage: 'lease_contract', category: 'contract', title: '임대차 계약 체결(양수인 명의)', owner: 'buyer', priority: 'high', dependsOn: [premium] });

  if (FOOD_INDUSTRIES.includes(v.industry)) {
    add({ stage: 'license_transfer', category: 'admin', title: '영업신고 지위승계 신고', owner: 'buyer', priority: 'high', dependsOn: [lease],
      checklist: ['양도양수 계약서', '양도인 인감증명서', '위생교육 수료증'] });
  }
  add({ stage: 'tax_registration', category: 'admin', title: '사업자등록(양수인)·폐업신고(양도인)', owner: 'both', dependsOn: [lease] });

  for (const s of v.staffRoles) {
    add({ stage: 'staff_contracts', category: 'staff', title: `고용 승계 협의: ${s.role}`, owner: 'both', dependsOn: [premium],
      checklist: ['근무 조건·급여 공유', '본인 의사 확인', '근로계약서 새로 작성'] });
  }
  for (const s of v.suppliers) {
    add({ stage: 'staff_contracts', category: 'supplier', title: `거래처 명의 변경: ${s.name}`, owner: 'seller', dependsOn: [lease],
      description: `${s.item}${s.orderCycle ? ` · 발주 ${s.orderCycle}` : ''}`,
      checklist: ['거래 조건·단가 공유', '명의·결제 정보 변경 요청', '첫 발주 같이 하기'] });
  }
  for (const e of v.equipment) {
    add({ stage: 'handover_settlement', category: 'equipment', title: `장비 인계: ${e.name} 작동 확인·매뉴얼 전달`, owner: 'both', dependsOn: [lease],
      description: `${e.qty}대 · ${e.year}년${e.repairs?.length ? ` · 수리 이력 ${e.repairs.join(', ')}` : ''}`,
      checklist: ['작동 확인', '매뉴얼·보증서 전달', '수리 이력 공유'] });
  }
  for (const a of v.digitalAccounts) {
    add({ stage: 'handover_settlement', category: 'account', title: `계정 이전: ${a.platform}`, owner: 'seller', dependsOn: [lease],
      description: ACCOUNT_KIND_LABEL[a.kind],
      checklist: ['계정 소유자 변경', '정산 계좌 변경', '비밀번호 재설정'] });
  }
  if (v.ownerTasks.length) {
    add({ stage: 'handover_settlement', category: 'manual', title: `점주 업무 인계: ${v.ownerTasks.join('·')}`, owner: 'seller', dependsOn: [premium],
      checklist: v.ownerTasks.map((t) => `${t} 방법 문서로 정리·시연`) });
  }
  add({ stage: 'post_tax', category: 'admin', title: '양도소득·부가세 신고 및 증빙 보관', owner: 'seller', dependsOn: [lease] });

  return tasks;
}
