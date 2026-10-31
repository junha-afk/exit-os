import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getFacts } from '@/lib/facts/repo';
import { getAnalysis } from '@/lib/analysis/repo';
import { generateSellerReport } from '@/lib/report/prompts/seller';
import { saveSellerReport } from '@/lib/report/repo';

const Body = z.object({ storeId: z.string().min(1) });

// POST /api/ai/report → SellerReport. 숫자는 분석 결과(코드 계산값)만 인용한다
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'storeId 가 필요합니다.' }, { status: 400 });
  const { storeId } = parsed.data;
  const [analysis, facts] = await Promise.all([getAnalysis(storeId), getFacts(storeId)]);
  if (!analysis) return NextResponse.json({ error: '재무 자료 분석을 먼저 실행해 주세요.' }, { status: 400 });
  const report = await generateSellerReport(analysis, facts);
  await saveSellerReport(storeId, report);
  return NextResponse.json(report);
}
