// 인수인계 생성·리스크 보고서 가벼운 테스트 (소유: B). 실행: npx -y tsx --test src/lib/handover/handover.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mockFacts, mockListing } from '@/lib/mocks';
import { fallbackRiskReport } from '@/lib/report/prompts/risk';
import { filterListingForViewer } from '@/lib/visibility';
import { generateHandoverTasks } from './generate';
import { summarizeTasks } from './progress';

test('데모 매장: 장비 5·거래처 3·계정 5·직원 3·지위승계·임대인 협의', () => {
  const tasks = generateHandoverTasks('d1', mockFacts, '2026-10');
  const count = (c: string) => tasks.filter((t) => t.category === c).length;
  assert.equal(count('equipment'), 5);
  assert.equal(count('supplier'), 3);
  assert.equal(count('account'), 5);
  assert.equal(count('staff'), 3);
  assert.ok(tasks.some((t) => t.title === '영업신고 지위승계 신고' && t.owner === 'buyer'));
  const landlord = tasks.find((t) => t.stage === 'landlord')!;
  assert.equal(landlord.title, '임대인 갱신 협의');
  assert.equal(landlord.priority, 'high');
  // 모든 선행 업무 id 가 실제로 존재
  const ids = new Set(tasks.map((t) => t.id));
  assert.ok(tasks.every((t) => t.dependsOn.every((d) => ids.has(d))));
});

test('진행률·지금 할 일', () => {
  const tasks = generateHandoverTasks('d1', mockFacts, '2026-10');
  const s = summarizeTasks(tasks);
  assert.equal(s.nextUp.length, 1);
  assert.equal(s.nextUp[0].stage, 'due_diligence');
  assert.equal(s.byStage.length, 12);
  assert.ok(s.byStage.every((b) => b.total > 0));
});

test('임대차 만료가 12개월 넘게 남으면 일반 협의 업무', () => {
  const facts = { ...mockFacts, lease_expiry: { value: '2029-01', provenance: 'user_input' as const } };
  const landlord = generateHandoverTasks('d1', facts, '2026-10').find((t) => t.stage === 'landlord')!;
  assert.equal(landlord.priority, 'normal');
});

test('리스크 보고서: 구독 전 구매자에게는 잠긴 재무 정보가 들어가지 않는다', () => {
  const report = fallbackRiskReport(filterListingForViewer(mockListing, 'buyer'), new Date('2026-10-31'));
  const text = JSON.stringify(report);
  assert.ok(!text.includes('1,400만'));          // 8월 현금 매출 (구독 정보)
  assert.ok(!text.includes('9,584만'));          // 권리금 추정 범위 (구독 정보)
  assert.ok(text.includes('구독 후 확인 가능'));
  assert.equal(report.overall.level, 'medium');   // 판단 불가 ≠ 안전
});

test('리스크 보고서: 구독자에게는 8월 현금 매출·점주 의존도·임대차 만료', () => {
  const report = fallbackRiskReport(filterListingForViewer(mockListing, 'buyer_subscribed'), new Date('2026-10-31'));
  const titles = report.risks.map((r) => r.title);
  assert.ok(titles.includes('2026-08 현금 매출 급증'));
  assert.equal(report.risks[0].level, 'high');
  assert.ok(titles.includes('점주 의존도 높음'));
  assert.ok(titles.includes('임대차 만료 8개월 남음'));
  assert.equal(report.overall.level, 'high');
});
