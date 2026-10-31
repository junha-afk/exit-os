// 금액·비율 표기 (소유: A). 계산은 하지 않고 C가 준 값을 보여주기만 한다.
const EOK = 100_000_000;
const MAN = 10_000;

/**
 * 원 단위 금액을 한국식으로 표기한다.
 * 158_000_000 → '1억 5,800만 원', 8_600_000 → '860만 원', 8_500 → '8,500원'
 * 만 원 미만 자리는 만 원 단위 표기에서 반올림한다.
 */
export function formatKRW(won: number, opts: { unit?: boolean } = {}): string {
  const { unit = true } = opts;
  const suffix = unit ? ' 원' : '';
  if (!Number.isFinite(won)) return '-';
  const sign = won < 0 ? '−' : '';
  const abs = Math.abs(won);

  if (abs < MAN) return `${sign}${abs.toLocaleString('ko-KR')}${unit ? '원' : ''}`;

  const totalMan = Math.round(abs / MAN);
  const eok = Math.floor(totalMan / (EOK / MAN));
  const man = totalMan % (EOK / MAN);

  const parts: string[] = [];
  if (eok > 0) parts.push(`${eok.toLocaleString('ko-KR')}억`);
  if (man > 0) parts.push(`${man.toLocaleString('ko-KR')}만`);
  return `${sign}${parts.join(' ')}${suffix}`;
}

/** 0.368 → '36.8%' (소수점 1자리) */
export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return '-';
  return `${(ratio * 100).toFixed(1)}%`;
}

/** 16.7 → '16.7개월', 정수면 소수점 생략 */
export function formatMonths(months: number): string {
  if (!Number.isFinite(months)) return '-';
  const v = Number.isInteger(months) ? months.toString() : months.toFixed(1);
  return `${v}개월`;
}

/** 범위 표기: (25_000_000, 30_000_000) → '2,500만 ~ 3,000만 원' */
export function formatKRWRange(low: number, high: number): string {
  return `${formatKRW(low, { unit: false })} ~ ${formatKRW(high)}`;
}
