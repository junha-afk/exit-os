import { NextResponse } from 'next/server';
import { listDocuments } from '@/lib/documents/repo';

// 소유: A. GET /api/stores/:id/documents → { documents }
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ documents: await listDocuments(id) });
}
