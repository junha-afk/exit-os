// 진단 질문 목록 (소유: A). 화면·서버가 같이 쓴다 (서버 전용 코드를 import 하지 않는다).
// - input: 화면에 뜨는 입력 도구 / fromInput: 입력값 → 저장값 / schema: 저장값 검증 / toInput: 저장값 → 수정용 입력값
// - question·defaultOptions: LLM이 실패했을 때 쓰는 기본 문구·보기
// - format: 자료 읽기 LLM에 알려주는 값 형식 설명
import { z } from 'zod';
import { formatKRW } from '@/lib/format';
import type { Equipment, FactKey, StaffRole } from '@/lib/types';
import { FNB_INDUSTRIES } from './fnb';
import type { InputSpec } from './types';

export type SlotGroup = '기본 정보' | '매각 가격·임대' | '운영' | '시설·자산';

export interface SlotDef {
  key: FactKey;
  label: string;
  group: SlotGroup;
  input: InputSpec;
  question: string;
  /** 업종에 따라 보기가 달라서 LLM이 보기를 만드는 슬롯 */
  needsOptions?: boolean;
  defaultOptions?: string[];
  format: string;
  schema: z.ZodType<unknown>;
  fromInput?: (raw: unknown) => unknown;
  toInput?: (stored: unknown) => unknown;
  display: (stored: unknown) => string;
}

const won = z.number().int().min(0).max(100_000_000_000);
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, '연·월을 골라 주세요.');
const name30 = z.string().trim().min(1, '입력해 주세요.').max(30, '30자 이내로 입력해 주세요.');
const list = (opts?: readonly string[]) =>
  z.array(opts ? z.string().min(1).max(30) : z.string().min(1).max(30)).min(1, '하나 이상 골라 주세요.').max(12);

const money = (v: unknown) => (typeof v === 'number' ? formatKRW(v) : '-');
const joined = (v: unknown) => (Array.isArray(v) ? v.join(', ') : '-');
const yesNo = (yes: string, no: string, unknown = '모름') => (v: unknown) => (v === true ? yes : v === false ? no : unknown);

const DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;
const STAFF_ROLES = ['매니저', '바리스타', '주방(조리)', '홀 서빙', '파트타임', '배달·포장', '기타'];
export const SLOTS: SlotDef[] = [
  // ── 기본 정보 ──
  {
    key: 'store_name', label: '매장명', group: '기본 정보',
    input: { type: 'name', maxLength: 30, placeholder: '예: 망원 브루랩' },
    question: '매장 이름이 무엇인가요?', format: 'string (상호, 30자 이내)',
    schema: name30, display: (v) => String(v),
  },
  {
    key: 'industry', label: '업종', group: '기본 정보',
    input: { type: 'choice', options: [...FNB_INDUSTRIES] },
    question: '어떤 업종의 매장인가요?', format: `다음 중 하나: ${FNB_INDUSTRIES.join(', ')}`,
    schema: z.enum(FNB_INDUSTRIES), display: (v) => String(v),
  },
  {
    key: 'region', label: '지역', group: '기본 정보',
    input: { type: 'name', maxLength: 30, placeholder: '예: 서울 마포구 망원동' },
    question: '매장이 있는 지역을 구·동까지 알려주세요.', format: "string (예: '서울 마포구 망원동', 번지 제외)",
    schema: name30, display: (v) => String(v),
  },
  {
    key: 'opened_at', label: '개업', group: '기본 정보', input: { type: 'month' },
    question: '언제 개업하셨나요?', format: "'YYYY-MM'", schema: month, display: (v) => String(v).replace('-', '년 ') + '월',
  },
  {
    key: 'sale_reason', label: '매각 사유', group: '기본 정보',
    input: { type: 'choice', options: ['해외 이주', '건강', '업종 전환', '수익 악화', '은퇴', '기타'] },
    question: '매장을 넘기시려는 이유는 무엇인가요?', format: '다음 중 하나: 해외 이주, 건강, 업종 전환, 수익 악화, 은퇴, 기타',
    schema: z.enum(['해외 이주', '건강', '업종 전환', '수익 악화', '은퇴', '기타']), display: (v) => String(v),
  },
  {
    key: 'desired_handover', label: '희망 매각 시기', group: '기본 정보', input: { type: 'month' },
    question: '언제쯤 넘기고 싶으신가요?', format: "'YYYY-MM'", schema: month, display: (v) => String(v).replace('-', '년 ') + '월',
  },
  {
    key: 'is_anonymous', label: '공개 방식', group: '기본 정보',
    input: { type: 'boolean', labels: ['익명으로 공개', '매장명 공개'] },
    question: '판매 페이지에 매장명을 숨기고 익명으로 올릴까요?', format: 'boolean',
    schema: z.boolean(), display: yesNo('익명으로 공개', '매장명 공개'),
  },
  {
    key: 'area_m2', label: '전용면적', group: '기본 정보', input: { type: 'number', unit: '㎡', min: 1, max: 3000, step: 0.1 },
    question: '매장 전용면적은 몇 ㎡인가요?', format: 'number (㎡). 평으로 적혀 있으면 숫자 그대로 두고 unit 에 "평"',
    schema: z.number().min(1).max(3000), display: (v) => `${v}㎡ (약 ${Math.round(Number(v) / 3.3058)}평)`,
  },
  {
    key: 'floor', label: '층', group: '기본 정보', input: { type: 'number', unit: '층', min: -5, max: 100 },
    question: '매장은 몇 층에 있나요? 지하는 -1로 입력해 주세요.', format: 'number (지하 1층 = -1)',
    schema: z.number().int().min(-5).max(100), display: (v) => (Number(v) < 0 ? `지하 ${-Number(v)}층` : `${v}층`),
  },
  {
    key: 'seats', label: '좌석', group: '기본 정보', input: { type: 'number', unit: '석', min: 0, max: 1000 },
    question: '홀 좌석은 몇 석인가요?', format: 'number (석)', schema: z.number().int().min(0).max(1000), display: (v) => `${v}석`,
  },

  // ── 매각 가격·임대 ──
  {
    key: 'premium_ask', label: '희망 권리금', group: '매각 가격·임대', input: { type: 'money' },
    question: '희망 권리금은 얼마인가요? 만원 단위로 입력해 주세요.', format: 'number (원)', schema: won, display: money,
  },
  {
    key: 'deposit', label: '임대보증금', group: '매각 가격·임대', input: { type: 'money' },
    question: '임대보증금은 얼마인가요? 만원 단위로 입력해 주세요.', format: 'number (원)', schema: won, display: money,
  },
  {
    key: 'monthly_rent', label: '월세', group: '매각 가격·임대', input: { type: 'money' },
    question: '월세는 얼마인가요? 만원 단위로 입력해 주세요.', format: 'number (원, 월 차임)', schema: won, display: money,
  },
  {
    key: 'maintenance_fee', label: '관리비', group: '매각 가격·임대', input: { type: 'money' },
    question: '월 관리비는 얼마인가요? 없으면 0을 입력해 주세요.', format: 'number (원, 월)', schema: won, display: money,
  },
  {
    key: 'lease_expiry', label: '임대차 만료', group: '매각 가격·임대', input: { type: 'month' },
    question: '임대차 계약은 언제 끝나나요?', format: "'YYYY-MM' (계약 종료 월)", schema: month,
    display: (v) => String(v).replace('-', '년 ') + '월',
  },
  {
    key: 'renewal_needed', label: '갱신 협의', group: '매각 가격·임대',
    input: { type: 'boolean', allowUnknown: true, labels: ['필요해요', '필요 없어요'] },
    question: '인수자가 임대인과 계약 갱신을 협의해야 하나요?', format: 'boolean 또는 null(모름)',
    schema: z.boolean().nullable(), display: yesNo('필요', '불필요'),
  },
  {
    key: 'est_initial_cost', label: '예상 초기 인수 비용', group: '매각 가격·임대', input: { type: 'money' },
    question: '인수자가 처음에 쓸 비용(재고·소모품·리뉴얼)은 얼마로 보시나요?', format: 'number (원)', schema: won, display: money,
  },

  // ── 운영 ──
  {
    key: 'owner_weekly_hours', label: '점주 근무', group: '운영', input: { type: 'number', unit: '시간', min: 0, max: 120 },
    question: '점주님은 일주일에 몇 시간 매장에서 일하시나요?', format: 'number (주당 시간)',
    schema: z.number().min(0).max(120), display: (v) => `주 ${v}시간`,
  },
  {
    key: 'staff_roles', label: '직원 구성', group: '운영',
    input: {
      type: 'table', addLabel: '역할 추가',
      columns: [
        { key: 'role', label: '역할', input: { type: 'choice', options: STAFF_ROLES } },
        { key: 'count', label: '인원', input: { type: 'number', unit: '명', min: 1, max: 50 } },
        { key: 'weeklyHours', label: '1인 주당', input: { type: 'number', unit: '시간', min: 0, max: 80 } },
      ],
    },
    question: '점주님을 뺀 직원 구성을 알려주세요. 없으면 비워 두고 다음으로 넘어가세요.',
    format: 'StaffRole[]: [{ role: string, count: number, weeklyHours?: number }]',
    schema: z.array(z.object({
      role: z.string().min(1).max(30), count: z.number().int().min(1).max(50), weeklyHours: z.number().min(0).max(80).optional(),
    })).max(20),
    display: (v) => {
      const rows = v as StaffRole[];
      return rows.length ? rows.map((r) => `${r.role} ${r.count}명${r.weeklyHours ? `(주 ${r.weeklyHours}시간)` : ''}`).join(', ') : '직원 없음';
    },
  },
  {
    key: 'open_days', label: '영업일', group: '운영', input: { type: 'multi', options: [...DAYS] },
    question: '어느 요일에 영업하시나요?', format: "('월'|'화'|'수'|'목'|'금'|'토'|'일')[]",
    schema: z.array(z.enum(DAYS)).min(1, '하나 이상 골라 주세요.'),
    display: (v) => ((v as string[]).length === 7 ? '매일' : joined(v)),
  },
  {
    key: 'open_hours', label: '영업시간', group: '운영', input: { type: 'time_range' },
    question: '영업시간은 몇 시부터 몇 시까지인가요?', format: "{ open: 'HH:mm', close: 'HH:mm' }",
    schema: z.object({ open: z.string().regex(/^\d{2}:\d{2}$/), close: z.string().regex(/^\d{2}:\d{2}$/) }),
    display: (v) => { const h = v as { open: string; close: string }; return `${h.open}–${h.close}`; },
  },
  {
    key: 'owner_tasks', label: '점주 전담 업무', group: '운영', input: { type: 'multi', options: [] }, needsOptions: true,
    defaultOptions: ['메뉴·레시피 개발', '식자재 발주', '위생 관리', '직원 스케줄', 'SNS·리뷰 관리', '매출 정산'],
    question: '점주님만 하시는 업무를 모두 골라 주세요.', format: 'string[]', schema: list(), display: joined,
  },
  {
    key: 'customer_segments', label: '주요 고객층', group: '운영', input: { type: 'multi', options: [] }, needsOptions: true,
    defaultOptions: ['인근 직장인', '주민·가족', '학생', '관광·방문객', '배달 단골'],
    question: '주로 오는 손님은 어떤 분들인가요?', format: 'string[]', schema: list(), display: joined,
  },
  {
    key: 'channel_mix', label: '판매 채널 비중', group: '운영',
    input: { type: 'percent_split', parts: [{ key: 'hall', label: '홀' }, { key: 'takeout', label: '포장' }, { key: 'delivery', label: '배달' }] },
    question: '매출 중 홀·포장·배달 비중은 대략 몇 %인가요?', format: '{ hall: number, takeout: number, delivery: number } (%, 합 100)',
    schema: z.object({ hall: z.number().min(0).max(100), takeout: z.number().min(0).max(100), delivery: z.number().min(0).max(100) })
      .refine((m) => Math.round(m.hall + m.takeout + m.delivery) === 100, '합이 100%가 되게 입력해 주세요.'),
    display: (v) => { const m = v as { hall: number; takeout: number; delivery: number }; return `홀 ${m.hall}% · 포장 ${m.takeout}% · 배달 ${m.delivery}%`; },
  },

  // ── 시설·자산 ──
  {
    key: 'equipment', label: '주요 장비', group: '시설·자산',
    input: {
      type: 'table', addLabel: '장비 추가',
      columns: [
        { key: 'name', label: '장비', input: { type: 'name', maxLength: 30, placeholder: '예: 에스프레소 머신' } },
        { key: 'qty', label: '수량', input: { type: 'number', unit: '대', min: 1, max: 100 } },
        { key: 'year', label: '구입 연도', input: { type: 'number', unit: '년', min: 1990, max: 2030 } },
        { key: 'purchasePrice', label: '구입가', input: { type: 'money', optional: true } },
      ],
    },
    question: '주방·홀의 주요 장비를 알려주세요.',
    format: 'Equipment[]: [{ name: string, qty: number, year: number, condition?: string, repairs?: string[], purchasePrice?: number(원) }]',
    schema: z.array(z.object({
      name: z.string().min(1).max(30), qty: z.number().int().min(1).max(100), year: z.number().int().min(1990).max(2030),
      condition: z.string().max(20).optional(), repairs: z.array(z.string().max(60)).optional(), purchasePrice: won.optional(),
    })).min(1, '장비를 하나 이상 입력해 주세요.').max(40),
    display: (v) => (v as Equipment[]).map((e) => `${e.name}${e.qty > 1 ? ` ${e.qty}대` : ''}(${e.year})`).join(', '),
  },
  {
    key: 'inventory_included', label: '양도 포함 품목', group: '시설·자산', input: { type: 'multi', options: [] }, needsOptions: true,
    defaultOptions: ['식자재 재고', '원두·음료 재료', '포장 용기', '소모품', '주방 소도구'],
    question: '매장을 넘길 때 함께 넘기는 품목을 골라 주세요.', format: 'string[]', schema: list(), display: joined,
  },
  {
    key: 'franchise_terms', label: '가맹 여부', group: '시설·자산',
    input: { type: 'choice', options: ['개인 매장', '프랜차이즈'] },
    question: '개인 매장인가요, 프랜차이즈 가맹점인가요?', format: "{ type: 'independent' | 'franchise', monthlyRoyalty?: number(원) }",
    schema: z.object({ type: z.enum(['independent', 'franchise']), monthlyRoyalty: won.optional() }),
    fromInput: (raw) => ({ type: raw === '프랜차이즈' ? 'franchise' : 'independent' }),
    toInput: (v) => ((v as { type: string }).type === 'franchise' ? '프랜차이즈' : '개인 매장'),
    display: (v) => ((v as { type: string }).type === 'franchise' ? '프랜차이즈' : '개인 매장'),
  },
];

export const SLOT_BY_KEY = Object.fromEntries(SLOTS.map((s) => [s.key, s])) as Partial<Record<FactKey, SlotDef>>;
export const SLOT_GROUPS: SlotGroup[] = ['기본 정보', '매각 가격·임대', '운영', '시설·자산'];

/** 입력값 → 저장값 검증. 실패하면 화면에 보여줄 한국어 문구 */
export function parseSlotInput(slot: SlotDef, raw: unknown): { ok: true; value: unknown } | { ok: false; error: string } {
  const value = slot.fromInput ? slot.fromInput(raw) : raw;
  const parsed = slot.schema.safeParse(value);
  if (parsed.success) return { ok: true, value: parsed.data };
  return { ok: false, error: koreanError(parsed.error.issues[0], slot) };
}

// zod 기본 문구(영어)를 화면용 한국어로 바꾼다. 슬롯에 직접 쓴 한국어 문구는 그대로 쓴다.
function koreanError(issue: z.core.$ZodIssue | undefined, slot: SlotDef): string {
  if (!issue) return '입력값을 확인해 주세요.';
  if (/[가-힣]/.test(issue.message)) return issue.message;
  const unit = slot.input.type === 'money' ? '원' : slot.input.type === 'number' ? slot.input.unit : '';
  if (issue.code === 'too_small') {
    const min = Number((issue as { minimum?: number | bigint }).minimum ?? 0);
    return slot.input.type === 'money' ? '0 이상으로 입력해 주세요.' : `${min.toLocaleString('ko-KR')}${unit} 이상으로 입력해 주세요.`;
  }
  if (issue.code === 'too_big') {
    const max = Number((issue as { maximum?: number | bigint }).maximum ?? 0);
    return slot.input.type === 'money' ? '금액이 너무 커요. 만원 단위로 입력했는지 확인해 주세요.' : `${max.toLocaleString('ko-KR')}${unit} 이하로 입력해 주세요.`;
  }
  if (issue.code === 'invalid_type') return '값을 입력해 주세요.';
  if (issue.code === 'invalid_value') return '보기 중에서 골라 주세요.';
  return '입력값을 확인해 주세요.';
}

/** 저장 형식 그대로의 값(자료에서 읽은 값) 검증 */
export function parseSlotStored(slot: SlotDef, value: unknown): { ok: true; value: unknown } | { ok: false } {
  const parsed = slot.schema.safeParse(value);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false };
}

/** 금액 슬롯인지 (자료에서 '만원' 단위로 읽은 값 환산용) */
export const isMoneySlot = (slot: SlotDef) => slot.input.type === 'money';
