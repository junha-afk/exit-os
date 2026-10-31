// 데모용 샘플 CSV 생성기: node data/generate-sample.mjs
// 시나리오: 망원동 카페 "망원 브루랩", 2025-10 ~ 2026-09 (12개월)
// 심어둔 이슈 (분석이 반드시 잡아야 함):
//   1) 2026-08 현금 매출 급증 (평소 ~8배) → needs_check  ← 판례의 가공 매출 패턴
//   2) 2025-10 ~ 2025-12 배달 매출이 POS에도 포함됨(included_in_pos=Y) → 중복 제거
//   3) 2026-03 원재료 매입 자료 누락 → missing
//   4) 2026-05 카드사 정산이 POS 카드매출과 5% 불일치 → needs_check
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'sample');
mkdirSync(OUT, { recursive: true });

const MONTHS = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03',
  '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
const MAN = 10_000;
const CARD = [2000, 1900, 2150, 1800, 1750, 2050, 2100, 2200, 2250, 2300, 2280, 2100]; // 만원
const CASH = [165, 150, 170, 140, 135, 160, 170, 175, 180, 185, 1400, 165];
const BAEMIN = [320, 310, 360, 300, 290, 330, 340, 350, 330, 320, 340, 330];
const COUPANG = [160, 150, 180, 150, 140, 170, 170, 180, 170, 160, 170, 165];
const ELEC = [45, 55, 65, 70, 65, 50, 45, 50, 65, 80, 85, 60];

const csv = (header, rows) => [header, ...rows.map((r) => r.join(','))].join('\n') + '\n';
const write = (name, header, rows) => writeFileSync(join(OUT, name), csv(header, rows));

write('pos_sales.csv', 'month,channel,amount', MONTHS.flatMap((m, i) => {
  // 2025-10~12: 배달 매출이 POS 카드 매출에 섞여 들어감
  const card = CARD[i] + (i < 3 ? BAEMIN[i] + COUPANG[i] : 0);
  return [[m, 'card', card * MAN], [m, 'cash', CASH[i] * MAN]];
}));

write('card_settlement.csv', 'month,card_company,amount', MONTHS.flatMap((m, i) => {
  const card = CARD[i] + (i < 3 ? BAEMIN[i] + COUPANG[i] : 0);
  const total = Math.round(card * (i === 7 ? 0.95 : 1));
  const a = Math.round(total * 0.55);
  return [[m, '신한카드', a * MAN], [m, '국민카드', (total - a) * MAN]];
}));

write('delivery_settlement.csv', 'month,platform,gross_sales,fees,net_payout,orders,included_in_pos',
  MONTHS.flatMap((m, i) => [['배민', BAEMIN[i], 0.18], ['쿠팡이츠', COUPANG[i], 0.15]].map(([p, g, r]) => {
    const fees = Math.round(g * r);
    return [m, p, g * MAN, fees * MAN, (g - fees) * MAN, Math.round((g * MAN) / 16000), i < 3 ? 'Y' : 'N'];
  })));

write('purchases.csv', 'month,vendor,category,amount', MONTHS.flatMap((m, i) => {
  if (m === '2026-03') return [];
  // 매입은 실제 영업 규모를 따름 → 8월 현금 급증분은 매입에 반영되지 않음
  const realCash = m === '2026-08' ? 165 : CASH[i];
  const base = CARD[i] + realCash + BAEMIN[i] + COUPANG[i];
  return [
    [m, '망원커피상사', '원두', Math.round(base * 0.11) * MAN],
    [m, '서울우유대리점', '유제품', Math.round(base * 0.07) * MAN],
    [m, '베이크마켓', '베이커리 재료', Math.round(base * 0.1) * MAN],
  ];
}));

write('fixed_costs.csv', 'month,item,amount', MONTHS.flatMap((m, i) => [
  [m, '임대료', 3_000_000], [m, '관리비', 350_000],
  [m, '전기·가스', ELEC[i] * MAN], [m, '통신·POS', 120_000],
]));

write('payroll.csv', 'month,role,hours,pay', MONTHS.flatMap((m) => [
  [m, '매니저(바리스타)', 209, 2_600_000],
  [m, '파트타임 A(오픈)', 100, 1_300_000],
  [m, '파트타임 B(마감)', 85, 1_100_000],
]));

console.log(`sample CSVs written to ${OUT}`);
