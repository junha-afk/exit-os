import { NextResponse } from 'next/server';
import { mockAnalysis } from '@/lib/mocks';

// POST /api/stores/:id/analyze → AnalysisResult  (목업)
export async function POST() {
  return NextResponse.json(mockAnalysis);
}
