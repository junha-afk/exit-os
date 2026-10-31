// 브라우저별 매장 id (공용 — 변경 시 팀 공지). 로그인 대신 쿠키 하나로 판매자 화면의 매장을 나눈다.
// src/middleware.ts 가 /seller 첫 방문 때 발급하고, 서버 코드는 여기 함수로만 읽는다.
// next/headers 를 import 하지 않는다 (middleware 에서도 쓰므로). 서버 컴포넌트는 cookies() 결과를 넘긴다.
import { NextResponse } from 'next/server';

export const STORE_COOKIE = 'store_id';
export const STORE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const STORE_ID = /^store-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const newStoreId = () => `store-${crypto.randomUUID()}`;
export const isStoreId = (v: string | undefined | null): v is string => !!v && STORE_ID.test(v);

/** 서버 컴포넌트: storeIdFromCookies(await cookies()) */
export function storeIdFromCookies(cookies: { get(name: string): { value: string } | undefined }): string | null {
  const v = cookies.get(STORE_COOKIE)?.value;
  return isStoreId(v) ? v : null;
}

/** 라우트 핸들러: 요청 쿠키의 매장 id */
export function storeIdFromRequest(req: Request): string | null {
  const v = req.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${STORE_COOKIE}=([^;]+)`))?.[1];
  return isStoreId(v) ? v : null;
}

/** 다른 브라우저의 매장이면 403 응답, 내 매장이면 null */
export function forbidOtherStore(req: Request, storeId: string): NextResponse | null {
  if (storeIdFromRequest(req) === storeId) return null;
  return NextResponse.json({ error: '이 매장에 접근할 수 없어요. 내 가게 팔기 화면에서 다시 시작해 주세요.' }, { status: 403 });
}
