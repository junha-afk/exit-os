// 계산 함수 가벼운 테스트 (소유: B). 실행: npx -y tsx --test src/lib/analysis/analysis.test.ts
// 샘플 CSV(data/sample)에 심어 둔 데모 이슈 4개가 모두 잡히는지 확인한다 (docs/DEMO_SCRIPT.md)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { MOCK_STORE_ID, mockFacts } from '@/lib/mocks';
import type { RecordKind } from '@/lib/types';
import { analyzeStore } from './analyze';
import { parseFinancialCsv, type FinancialRecord } from './parse';
import { paybackMonths } from './payback';
import { crossCheck, lowest } from './provenance';
import { ownerDependency, revenueStability } from './scores';
import { adjustedMonthlyProfit, facilityValue } from './valuation';

const FILES: Record<RecordKind, string> = {
  pos: 'pos_sales.csv', card_settlement: 'card_settlement.csv', delivery: 'delivery_settlement.csv',
  purchases: 'purchases.csv', fixed: 'fixed_costs.csv', payroll: 'payroll.csv',
};

function loadSample(): FinancialRecord[] {
  return (Object.keys(FILES) as RecordKind[]).flatMap((kind) => {
    const r = parseFinancialCsv(kind, readFileSync(`data/sample/${FILES[kind]}`, 'utf8'));
    assert.ok(r.ok, `${kind} 파싱 실패`);
    return r.records;
  });
}

test('샘플 데이터: 데모 이슈 4개와 중복 제거 6건', () => {
  const result = analyzeStore({ storeId: MOCK_STORE_ID, records: loadSample(), facts: mockFacts });
  assert.ok(result);
  const kinds = result.anomalies.map((a) => `${a.month} ${a.kind}`);

  assert.equal(result.dedupeCount, 6);
  assert.ok(kinds.includes('2026-08 cash_ratio'));
  assert.equal(result.anomalies.find((a) => a.kind === 'cash_ratio')!.severity, 'high');
  assert.ok(kinds.includes('2026-05 settlement_mismatch'));
  assert.deepEqual(result.missing, ['2026-03 원재료 매입']);

  const aug = result.months.find((m) => m.month === '2026-08')!;
  assert.equal(aug.revenue.provenance, 'needs_check');
  assert.equal(result.months.length, 12);
  assert.equal(result.avgRevenue.value, 28_300_000);   // DEMO_SCRIPT 예상 약 2,830만
});

test('업로드: 같은 행이 두 번 있으면 1건만 남긴다', () => {
  const csv = 'month,channel,amount\n2026-01,card,1000000\n2026-01,card,1000000\n2026-01,cash,50000\n';
  const r = parseFinancialCsv('pos', csv);
  assert.ok(r.ok);
  assert.equal(r.records.length, 2);
  assert.equal(r.duplicates, 1);
});

test('업로드: 템플릿과 다른 컬럼은 거절', () => {
  const r = parseFinancialCsv('pos', 'date,total\n2026-01,100\n');
  assert.equal(r.ok, false);
});

test('출처 판정', () => {
  assert.equal(crossCheck(1_000_000, 1_020_000), 'verified');
  assert.equal(crossCheck(1_000_000, 950_000), 'needs_check');
  assert.equal(crossCheck(1_000_000, null), 'user_input');
  assert.equal(lowest('verified', 'user_input', 'verified'), 'user_input');
});

test('점수·가치·회수기간 공식', () => {
  assert.equal(revenueStability([100, 100, 100]), 100);
  assert.equal(ownerDependency(60, 3), 84);
  assert.equal(adjustedMonthlyProfit(10_000_000, 60, 12_000), 6_871_600);
  assert.equal(facilityValue([{ name: '오븐', qty: 1, year: 2024, purchasePrice: 5_000_000 }], 2026), 3_000_000);
  assert.equal(paybackMonths(160_000_000, 15_000_000, 10_000_000), 17.5);
  assert.equal(paybackMonths(160_000_000, 15_000_000, 0), null);
});
