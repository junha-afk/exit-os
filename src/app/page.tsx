// 메인 = 매물 목록 (소유: A). 랜딩은 따로 만든다.
import { headers } from 'next/headers';
import { ListingBrowser } from '@/components/common';
import { buildListingRows } from '@/components/common/listing-rows';
import { getViewer } from '@/lib/visibility';

export default async function Home() {
  const viewer = getViewer(new Request('http://local', { headers: await headers() }));
  return <ListingBrowser rows={buildListingRows(viewer)} viewer={viewer} />;
}
