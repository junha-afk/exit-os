// 판매자 화면 첫 방문 때 이 브라우저의 매장 id 쿠키를 발급한다 (src/lib/store-session.ts)
import { NextResponse, type NextRequest } from 'next/server';
import { STORE_COOKIE, STORE_COOKIE_MAX_AGE, isStoreId, newStoreId } from '@/lib/store-session';

export function middleware(req: NextRequest) {
  if (isStoreId(req.cookies.get(STORE_COOKIE)?.value)) return NextResponse.next();

  const id = newStoreId();
  // 같은 요청의 서버 컴포넌트도 새 id 를 읽도록 요청 쿠키에도 넣는다
  req.cookies.set(STORE_COOKIE, id);
  const res = NextResponse.next({ request: { headers: req.headers } });
  res.cookies.set(STORE_COOKIE, id, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: STORE_COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}

export const config = { matcher: ['/seller/:path*'] };
