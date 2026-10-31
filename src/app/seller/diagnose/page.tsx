// 가치 진단 페이지 (소유: A)
import { cookies } from 'next/headers';
import { DiagnoseClient } from '@/components/interview/DiagnoseClient';
import { storeIdFromCookies } from '@/lib/store-session';

export const metadata = { title: '내 가게 가치 진단 · ExitOS' };

// 매장 = 이 브라우저의 store_id 쿠키 (middleware 가 첫 방문 때 발급)
export default async function DiagnosePage() {
  const storeId = storeIdFromCookies(await cookies());
  if (!storeId) throw new Error('store_id 쿠키가 없습니다 (src/middleware.ts 확인)');
  return <DiagnoseClient storeId={storeId} />;
}
