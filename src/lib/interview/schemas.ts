// 정보 수집 LLM 응답 스키마 (소유: A). prompts.ts 의 "출력 형식"과 같게 유지한다.
// 여기서는 모양만 검사한다. 값이 맞는지(목록에 있는 슬롯·자료 종류인지, facts 값 형식)는 호출부 코드가 다시 검사한다.
import { z } from 'zod';

// ── 1. 진단: 다음 질문 또는 자료 요청 ──
export const DiagnosisNextSchema = z.object({
  action: z.enum(['ask_slot', 'request_document', 'done']),
  next_slot: z.string().nullable().default(null),
  doc_kind: z.string().nullable().default(null),
  question: z.string().max(100).default(''),
  reason: z.string().max(80).default(''),
  options: z.array(z.string().min(1).max(30)).max(8).default([]),
});
export type DiagnosisNext = z.infer<typeof DiagnosisNextSchema>;

// ── 2-1. 자료 읽기: 문서·사진 ──
export const DocumentReadSchema = z.object({
  detected_kind: z.string().min(1),
  summary: z.string().max(300).default(''),
  facts: z
    .array(z.object({
      key: z.string(),
      value: z.unknown(),
      /** 적힌 단위가 fact 형식과 다를 때만 (예: '평'). 환산은 코드가 한다 */
      unit: z.string().nullable().default(null),
      evidence: z.string().max(120).default(''),
    }))
    .default([]),
  records: z
    .array(z.object({ date: z.string(), fields: z.record(z.string(), z.unknown()) }))
    .max(300)
    .default([]),
  unreadable: z.boolean().default(false),
  notes: z.array(z.string()).default([]),
});
export type DocumentRead = z.infer<typeof DocumentReadSchema>;

// ── 2-2. 자료 읽기: 표 파일 열 매핑 ──
export const TableMappingSchema = z.object({
  detected_kind: z.string().min(1),
  column_map: z.record(z.string(), z.string().nullable()),
  date_parts: z.object({ year: z.string(), month: z.string(), day: z.string().nullable().optional() }).nullable().default(null),
  amount_unit: z.enum(['won', 'thousand_won']).default('won'),
  channel_values: z.record(z.string(), z.enum(['card', 'cash'])).default({}),
  skip_row_hint: z.array(z.string()).default([]),
  summary: z.string().max(200).default(''),
  notes: z.array(z.string()).default([]),
});
export type TableMapping = z.infer<typeof TableMappingSchema>;

// ── 3. 노하우 ──
export const KnowhowOptionsSchema = z.object({
  options: z.array(z.string().min(1).max(30)).min(1).max(8),
});

export const KnowhowArtifactsSchema = z.object({
  roleManual: z.array(z.object({ role: z.string(), duties: z.array(z.string()) })),
  trainingChecklist: z.array(z.string()),
  ownerBurdenSummary: z.string(),
  supplierHandover: z.array(z.object({ name: z.string(), item: z.string(), orderCycle: z.string().optional() })),
});
