import { NextResponse } from 'next/server';
import { forbidOtherStore } from '@/lib/store-session';
import { listDocuments } from '@/lib/documents/repo';

// 소유: A. GET /api/stores/:id/documents → { documents }
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = forbidOtherStore(req, id);
  if (denied) return denied;
  return NextResponse.json({ documents: await listDocuments(id) });
}
