// 화면 사이 이동 주소 (소유: A). 주소가 바뀌면 여기만 고친다.
// TODO(C): 로그인 사용자의 진행 중 거래 id 를 주는 API 가 생기면 handover 를 그 값으로 만든다
export const ROUTES = {
  home: '/', // 랜딩
  listings: '/listings',
  listing: (id: string) => `/listings/${id}`,
  risk: (id: string) => `/listings/${id}/risk`,
  sell: '/seller/diagnose', // A 담당 화면 (진단)
  sellReport: '/seller/report', // B 담당 화면 (매각 보고서)
  knowhow: '/seller/knowhow', // A 담당 화면 (노하우, P2)
  handover: '/handover/mock-deal-1', // 데모 거래 (C 목업 MOCK_DEAL_ID)
} as const;
