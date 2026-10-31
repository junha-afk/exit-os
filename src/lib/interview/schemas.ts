// 정보 수집 LLM 응답 스키마 (소유: A). prompts.ts 의 "출력 형식"과 같게 유지한다.
import { z } from 'zod';
import type { RecordKind } from '@/lib/types';

const UPLOAD_KINDS = ['none', 'pos', 'card_settlement', 'delivery', 'purchases', 'fixed', 'payroll'] as const satisfies readonly ('none' | RecordKind)[];

export const DiagnosisNextSchema = z.object({
  next_slot: z.string().min(1),
  question: z.string().min(1).max(80),
  options: z.array(z.string().min(1).max(30)).max(8).default([]),
  ask_upload: z.enum(UPLOAD_KINDS).default('none'),
});
export type DiagnosisNext = z.infer<typeof DiagnosisNextSchema>;

export const KnowhowOptionsSchema = z.object({
  options: z.array(z.string().min(1).max(30)).min(1).max(8),
});

export const KnowhowArtifactsSchema = z.object({
  roleManual: z.array(z.object({ role: z.string(), duties: z.array(z.string()) })),
  trainingChecklist: z.array(z.string()),
  ownerBurdenSummary: z.string(),
  supplierHandover: z.array(z.object({ name: z.string(), item: z.string(), orderCycle: z.string().optional() })),
});
