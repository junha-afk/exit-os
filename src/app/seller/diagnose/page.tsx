// 가치 진단 페이지 (소유: A)
import { DiagnoseClient } from '@/components/interview/DiagnoseClient';
import { MOCK_STORE_ID } from '@/lib/mocks';

export const metadata = { title: '내 가게 가치 진단 · ExitOS' };

export default function DiagnosePage() {
  return <DiagnoseClient storeId={MOCK_STORE_ID} />;
}
