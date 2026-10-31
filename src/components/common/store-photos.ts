// 시연용 매장 사진 (소유: A). public/stores/*.jpg, 출처 Unsplash(무료 라이선스).
// TODO(C): 매물 photos 필드에 실제 업로드 사진이 들어오면 이 표를 지운다.
export const STORE_PHOTOS: Record<string, string[]> = {
  'mock-listing-1': ['/stores/mangwon-1.jpg', '/stores/mangwon-3.jpg', '/stores/mangwon-2.jpg', '/stores/mangwon-4.jpg', '/stores/mangwon-5.jpg'],
  'mock-listing-2': ['/stores/yeonnam-bakery.jpg'],
  'mock-listing-3': ['/stores/seongsu-bunsik.jpg'],
  'demo-g': ['/stores/sangsu-brunch.jpg'],
  'demo-h': ['/stores/euljiro-gukbap.jpg'],
  'demo-i': ['/stores/hapjeong-winebar.jpg'],
  'demo-j': ['/stores/seochon-cafe.jpg'],
};

export const photosOf = (id: string, fromListing: string[] = []) => (fromListing.length ? fromListing : STORE_PHOTOS[id] ?? []);
