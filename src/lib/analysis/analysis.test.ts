// 계산 함수 가벼운 테스트 (소유: B). 실행: npx -y tsx --test src/lib/analysis/analysis.test.ts
// 샘플 CSV(data/sample)에 심어 둔 데모 이슈 4개가 모두 잡히는지 확인한다 (docs/DEMO_SCRIPT.md)
// 재무 행은 A의 getFinancialRows 가 주는 형식(FinancialRow) 그대로 넣는다 (DB 없이 data/sample 을 직접 읽음)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import Papa from 'papaparse';
import type { FinancialRow } from '@/lib/documents/types';
import { MOCK_STORE_ID, mockFacts } from '@/lib/mocks';
import { analyzeStore } from './analyze';
import { fromFinancialRows } from './parse';
import { paybackMonths } from './payback';
import { crossCheck, lowest } from './provenance';
import { ownerDependency, revenueStability } from './scores';
import { adjustedMonthlyProfit, facilityValue } from './valuation';

// A의 documents/repo.ts sampleRows 와 같은 방식으로 data/sample CSV → FinancialRow
const SAMPLE = { pos: 'pos_sales', card_settlement: 'card_settlement', delivery: 'delivery_settlement', purchases: 'purchases', fixed: 'fixed_costs', payroll: 'payroll' };
const NUMERIC = new Set(['amount', 'gross_sales', 'fees', 'net_payout', 'orders', 'hours', 'pay']);
const sampleRows = async (): Promise<FinancialRow[]> => Object.entries(SAMPLE).flatMap(([kind, file]) =>
  Papa.parse<Record<string, string>>(readFileSync(`data/sample/${file}.csv`, 'utf8'), { header: true, skipEmptyLines: true }).data
    .map(({ month, ...rest }) => row(kind, month, Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, NUMERIC.has(k) ? Number(v) : v])), `sample:${file}`)));
const analyze = (rows: FinancialRow[]) => analyzeStore({ storeId: MOCK_STORE_ID, ...fromFinancialRows(rows), facts: mockFacts });

const row = (kind: string, date: string, fields: FinancialRow['fields'], documentId = 'doc-1', readBy: FinancialRow['readBy'] = 'code_table'): FinancialRow =>
  ({ storeId: 's', documentId, kind, date, month: date.slice(0, 7), fields, readBy });

test('샘플 데이터: 데모 이슈 4개와 중복 제거 6건', async () => {
  const result = analyze(await sampleRows());
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

test('같은 자료를 두 번 올려도 매출이 두 배가 되지 않는다', async () => {
  const rows = await sampleRows();
  const again = rows.filter((r) => r.kind === 'pos').map((r) => ({ ...r, documentId: 'reupload' }));
  assert.equal(analyze([...rows, ...again])!.avgRevenue.value, 28_300_000);
});

test('일별 행은 월로 합치고, POS 포함 표기는 예·포함 등도 읽는다', () => {
  const { records } = fromFinancialRows([
    row('pos', '2026-01-03', { channel: '신용카드', amount: 100_000 }),
    row('pos', '2026-01-03', { channel: '신용카드', amount: 100_000 }),   // 같은 날 같은 금액도 별개 거래
    row('pos', '2026-01-04', { channel: '현금', amount: '5,000' }),
    row('pos', '2026-01-05', { channel: '현금', amount: null }),          // 못 읽은 금액은 버린다
    row('delivery', '2026-01-03', { platform: '배민', gross_sales: 30_000, fees: 3_000, net_payout: 27_000, orders: 2, included_in_pos: '예' }),
    row('delivery', '2026-01-09', { platform: '배민', gross_sales: 20_000, fees: 2_000, net_payout: 18_000, orders: 1, included_in_pos: '포함' }),
  ]);
  const pos = records.filter((r) => r.kind === 'pos');
  assert.deepEqual(pos.map((r) => [r.category, r.amount]), [['card', 200_000], ['cash', 5_000]]);
  const delivery = records.filter((r) => r.kind === 'delivery');
  assert.equal(delivery.length, 1);
  assert.equal(delivery[0].amount, 50_000);
  assert.equal(delivery[0].extra.included_in_pos, 'Y');
  assert.equal(delivery[0].extra.orders, 3);
});

test('현금영수증이 현금 매출과 맞으면 8월이 이상치에서 빠지고, 사진에서 읽은 행은 확인 필요', async () => {
  const rows = await sampleRows();
  const augCash = rows.filter((r) => r.kind === 'pos' && r.month === '2026-08' && r.fields.channel === 'cash')
    .reduce((s, r) => s + Number(r.fields.amount), 0);
  const withReceipt = analyze([...rows, row('cash_receipt', '2026-08', { amount: augCash }, 'receipt')])!;
  assert.ok(!withReceipt.anomalies.some((a) => a.kind === 'cash_ratio'));

  const fromPhoto = rows.map((r) => (r.kind === 'fixed' && r.month === '2026-01' ? { ...r, readBy: 'llm_document' as const } : r));
  const jan = analyze(fromPhoto)!.months.find((m) => m.month === '2026-01')!;
  assert.equal(jan.revenue.provenance, 'needs_check');
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
