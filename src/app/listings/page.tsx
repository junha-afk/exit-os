// 매물 목록 (소유: A). 랜딩(/)의 "매물 확인하기"로 들어온다.
import { headers } from 'next/headers';
import { ListingBrowser } from '@/components/common';
import { buildListingRows } from '@/components/common/listing-rows';
import { getViewer } from '@/lib/visibility';

export default async function ListingsPage() {
  const viewer = getViewer(new Request('http://local', { headers: await headers() }));
  return <ListingBrowser rows={await buildListingRows(viewer)} viewer={viewer} />;
}
