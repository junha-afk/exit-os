# A 작업 인수인계 (Claude Code → Codex)

작성: 2026-10-31 · 담당: **A (PM·디자인·구매자 화면)** · 작업 브랜치: 로컬 `feat/A-frontend-skeleton` → 원격 `sihu`

이 문서만 읽고 이어서 작업할 수 있게 정리했다. 먼저 `CLAUDE.md`, `.claude/skills/exitos/SKILL.md`, `docs/TEAM_PLAN.md`, `docs/DEMO_SCRIPT.md` 를 읽을 것.

---

## 1. 지켜야 할 규칙

**역할·소유권 (TEAM_PLAN)**
- A가 고칠 수 있는 곳: `src/app/page.tsx`, `src/app/listings/**`, `src/app/handover/**`, `src/components/common/**`, `src/lib/format.ts`, `docs/DEMO_SCRIPT.md`, 앱 셸 `src/app/layout.tsx`·`src/app/globals.css`.
- **C 소유라 수정 금지**: `src/app/api/**`, `src/lib/{types,visibility,supabase}.ts`, `src/lib/{analysis,handover}/**`, `src/lib/mocks/*.json`, `package.json`·lockfile·`next.config`·`components.json`, `supabase/**`, `data/**`. 필요하면 변경 제안만 적어 C에게 요청.
- `npm i`, `npx shadcn add` 는 C만 실행한다. 새 패키지가 필요하면 요청.
- B 소유: `/seller/**` (진단·보고서). D 소유: `src/app/api/ai/**`, `src/lib/ai/**`.

**Git·보안 (사용자 전역 규칙)**
- main 직접 커밋·푸시 금지. force push, `git reset --hard`, 히스토리 재작성 금지.
- 푸시는 `git push origin HEAD:sihu` (sihu 는 사용자 개인 원격 브랜치). 푸시 전 사용자 확인.
- `.env`·키·토큰은 커밋·출력 금지. `NEXT_PUBLIC_` 금지.
- 커밋 메시지 형식: `[A] 한국어 요약` + 본문 bullet. 커밋 전 `npx tsc --noEmit`, `npx eslint <바꾼 경로>`, 가능하면 `npm run build`.
- 사용자는 한국어로 소통. UI 문구 한국어, 코드 식별자 영어.

**도메인 규칙 (SKILL.md 핵심)**
- 숫자에는 출처 라벨: `verified`(🟢 증빙 확인) / `user_input`(🔵 사용자 입력) / `needs_check`(🟠 확인 필요). `<Metric>` 사용.
- 공개 범위는 서버에서 자른다: 반드시 C의 `filterListingForViewer` 결과(`{locked:true, level}`)만 믿고 그린다. 클라이언트에서 숨기기만 하는 방식 금지.
- 돈 계산은 코드로, LLM은 문장만. AI 추정이 보이는 곳엔 `<AiEstimateNotice />`.

**사용자가 정한 디자인 결정 (바꾸지 말 것)**
- **둥근 모서리 사각형 금지** (`--radius: 0`). 예외: 켜기/끄기 스위치, 작은 점, 원형 자물쇠 아이콘.
- **역할 전환 UI 없음.** 한 계정으로 팔 수도 살 수도 있다. 구독은 사용자 상태(내 정보에서 구독/해지), 열람 승인은 매물별로 "열람 승인 요청"으로 열린다.
- 색: **딥그린** 브랜드(`--primary: oklch(0.36 0.07 163)`), 연한 회녹 띠(`--accent`). 출처 배지 색은 의미색이라 유지.
- 폰트 Pretendard(CDN, `layout.tsx`). 숫자는 `tabular-nums`.
- 메인 = **매물 목록**(랜딩은 따로). 카드 그리드가 아니라 **세로 스크롤 목록**. 정렬·필터는 왼쪽 위 ☰ 메뉴.
- 상세 탭은 알바몬식 **폴더 탭**(붙은 네모 칸, 선택 탭만 흰 바탕).
- "AI 티" 나는 것 싫어함: 그라데이션, 이모지 아이콘, 장식 카드 그리드 피하기.
- 모바일은 따로 친화적으로: 하단 탭바, 사진 좌우 넘기기, 상세 하단 고정 버튼.

---

## 2. 현재 상태

**커밋 (모두 원격 `sihu` 에 푸시됨, 최신 `e2c5d31`)**
```
e2c5d31 [A] 실제 웹 형태: 상단 메뉴·내 정보(구독)·딥그린·모바일 대응
eab6bcb [A] 매장 사진·상세 톤 통일·비슷한 매물 가로 목록
3a0275b [A] 메인 매물 목록(☰ 정렬·필터)·상세 폴더 탭·모서리 제거
6c0fc21 [A] 공통 컴포넌트·매물 상세 페이지(탭)·Pretendard 적용
6376db9 [C] 공용 타입·공개 범위 필터·전체 API 목업 응답   ← main 과 같은 지점
```
- main 이후 다른 팀원 커밋 없음(마지막 확인 시점). 작업 시작 전 `git fetch` 로 main 변화 확인.
- 커밋 안 된 로컬 파일: `src/app/kit/` (공통 컴포넌트 미리보기, **커밋하지 않음**).
- 스택 실제 버전: **Next.js 15.5**, React 19.1, Tailwind v4, shadcn(Base UI), Recharts 3, lucide-react.

**실행**
- `npm run dev` → http://localhost:3000 (`/`, `/listings/mock-listing-1`)
- 개발 서버가 켜진 상태에서 `npm run build` 하면 `.next` 를 같이 써서 꼬인다. 빌드 전 dev 서버를 끌 것. 이상한 타입 에러는 `.next` 캐시 삭제 후 재시도.

---

## 3. 만든 화면 (스크린샷: `/Users/jinsihu/workplace/hackathon/mockups/`)

| 화면 | 스크린샷 | 설명 |
|---|---|---|
| 전체 요약 | `v4-overview.png` | 데스크톱 메인+내 정보 메뉴, 모바일 메인·상세, 데스크톱 상세 |
| 메인 데스크톱 | `v4-main-desktop.png` | 헤더(매물 찾기/내 가게 팔기/인수인계, 검색, 관심, 내 정보), 회녹 띠+업종 칩, 목록, 오른쪽 패널(가치 진단 배너·조건 요약) |
| 내 정보 메뉴 | `v4-account.png` | 구독 상태 + 구독/해지 버튼, 바로가기 |
| 메인 모바일 | `v4-main-mobile.png` | 축소 헤더, 업종 칩 가로 스크롤, 하단 탭바 |
| 상세 데스크톱 | `v4-detail-desktop.png` | 사진 갤러리(1+4), 핵심 숫자 4칸, 폴더 탭, 오른쪽 고정 패널 |
| 상세 모바일 | `v4-detail-mobile.png` | 사진 좌우 넘기기(1/5), 하단 고정 가격+행동 버튼 |
| ☰ 정렬·필터 | `app-menu.png` | 정렬, 지역, 업종, 자료 스위치(증빙 절반 이상/확인 필요 없음) |
| 비슷한 매물 | `similar-strip.png` | 가로 스크롤 카드 + 아래 스크롤 막대 |
| 탭 | `listing-square-tabs.png` | 폴더 탭 + 박스 밖 섹션 제목 |

정적 목업(참고용, 앱 아님): `mockups/main.html`(세로 목록 초안), `mockups/landing-draft.html`(랜딩 초안, 나중에 랜딩 만들 때 참고).

---

## 4. 코드 지도 (A 소유)

```
src/app/
  layout.tsx                 Pretendard CDN, TooltipProvider, Toaster
  globals.css                토큰(딥그린·radius 0), .scroll-strip, .no-scrollbar
  page.tsx                   메인: buildListingRows(viewer) → <ListingBrowser>
  listings/[id]/
    page.tsx                 상세: filterListingForViewer → 히어로·탭·오른쪽 패널·모바일 하단 바
    _components/
      ListingTabs.tsx        폴더 탭(선택 탭만 렌더, #hash 동기화)
      RevenueTrend.tsx       Recharts 매출 막대+영업이익 선 (확인 필요 달 주황)
      ViewerAction.tsx       다음 행동 버튼: 구독 → 열람 승인 요청 → 리스크 보고서
      SimilarListings.tsx    비슷한 매물 가로 스크롤
src/components/common/
  index.ts                   barrel
  Metric.tsx                 출처 배지 붙은 숫자 (provenance 필수)
  ProvenanceBadge.tsx        🟢🔵🟠 배지
  LockedSection.tsx          서버 Locked 를 블러+자물쇠로
  AiEstimateNotice.tsx       AI 추정 고지
  RoleSwitcher.tsx           (UI로는 안 씀) DEMO_ROLE_COOKIE, ROLE_LABEL, useMembership() ← 구독·승인 쿠키 변경
  SiteHeader.tsx             사이트 헤더 + 내 정보 메뉴(구독/해지)
  SiteFooter.tsx             바닥글
  MobileTabBar.tsx           모바일 하단 탭바
  ListingBrowser.tsx         메인 목록(필터·정렬 상태, ☰ 서랍, 오른쪽 패널)
  listing-source.ts          ★ 매물 데이터를 받는 유일한 곳(서버). getListingRecord / listListingSummaries / getListingView
  listing-rows.ts            목록 행 생성(서버, async). listing-source 만 사용. 상세 없는 매물은 SUPPLEMENT·DEMO_ROWS 로 채움
  routes.ts                  화면 이동 주소 모음(ROUTES). 인수인계·판매 주소는 여기만 고친다
  store-photos.ts            시연용 사진 매핑 (public/stores/*.jpg, Unsplash)
src/lib/format.ts            formatKRW / formatPercent / formatMonths / formatKRWRange
public/stores/               시연용 매장 사진 11장
```

**데이터 흐름 (B·C·D 기능을 받는 구조)**
- 화면 → `listing-source.ts` → (지금) C 목업 / (나중) C의 DB 함수. **화면 파일은 `@/lib/mocks` 를 직접 import 하지 않는다.** C가 `getListing(id)`·`listListings()` 같은 서버 함수를 주면 `listing-source.ts` 안 두 함수만 교체.
- 상세는 `getListingView(id, viewer)` 결과(C 필터 통과)만 그린다. 목업 id 고정 없음 → 데이터가 있는 매물은 어떤 id든 열리고, 없으면 404. B의 "판매 페이지로 게시"로 생긴 매물도 C 데이터에 들어오면 자동으로 열린다.
- 목록 행: 상세가 있는 매물은 필터된 실제 필드(면적·층·소개·월 이익)로, 없는 매물은 `SUPPLEMENT`/`DEMO_ROWS`(시연 보조값)로 채운다. 상세 없는 매물의 월 이익 잠금은 C의 `canView(viewer,'subscriber')` 로 판단.
- D의 AI 설명(`Anomaly.aiExplanation`)이 오면 상세 AI 분석의 '확인이 필요한 점' 아래에 "AI 설명 · …"으로 표시된다.
- viewer(공개 범위 기준)는 쿠키 `demo_role`: `buyer`(기본) / `buyer_subscribed` / `buyer_approved` / `seller`. 화면에서는 `useMembership()` 으로만 바꾼다.
- 서버 컴포넌트에서는 `getViewer(new Request('http://local', { headers: await headers() }))` 로 C의 `getViewer(req)` 를 재사용 중(우회). C에게 서버 컴포넌트용 함수 요청 예정.
- 지금 C 목업에서 상세 데이터가 있는 매물은 `mock-listing-1`(망원동 카페 A) 하나뿐. 상세 없는 행은 링크를 걸지 않는다(404 방지).

**아직 B·C·D 연결이 비어 있는 곳**
- "거래 성사" 버튼이 어디에도 없음(데모 2:30). `POST /api/deals` → `ROUTES.handover` 로 이동하는 버튼을 판매자 흐름(B 화면 또는 인수인계 진입)에 둘지 정해야 함.
- 인수인계 주소는 `ROUTES.handover`(데모 거래 고정). C가 진행 중 거래 id API를 주면 교체.
- 역할 전환 제거로 판매자가 '내 매물'로 보는 화면이 없음(viewer `seller` 로 가는 길 없음).

**알아둘 함정**
- Tailwind v4는 안 쓰는 색 변수를 CSS에 넣지 않는다 → Recharts 색은 `var(--color-*)` 대신 hex.
- next/image 갤러리: 모바일 전용 이미지의 `sizes` 를 `(max-width: 767px) 100vw, 1px` 로 둬야 경고가 안 난다.

---

## 5. 다음에 할 일 (우선순위 순)

### 5-1. 인수인계 대시보드 `/handover/[dealId]` — **진행 중 (기획 단계)**
- 데모 2:30: "거래 성사" → 12단계 타임라인, 자동 생성 업무, 몇 개 완료 처리 → 진행률 상승, "지금 할 일" 갱신.
- 쓸 수 있는 것(C 목업, 이미 동작): `GET /api/deals/mock-deal-1/tasks` → `{ tasks, progress, byStage, nextUp }`(집계는 `src/lib/handover/progress.ts` 의 `summarizeTasks`, 실제 계산), `PATCH /api/tasks/:id` `{status}`(서버 메모리 반영), `POST /api/deals`. 타입은 `types.ts` 의 `HandoverTask`, `HANDOVER_STAGES`, `DealTasksResponse`.
- 목업 데이터 관찰(26개):
  - 완료 3개(prep·valuation·buyer_search). 업무가 `handover_settlement`(장비 5·계정 5) 와 `staff_contracts`(직원 3·거래처 3) 에 몰림, 나머지 단계는 1개씩.
  - 선행 구조: 지금 할 일은 **실사(task-04) 1개뿐** → 임대인 협의 → 권리금 계약 → 임대차 계약(task-07) 이 끝나면 **19개가 한 번에 풀린다**. "지금 할 일"이 1개일 때와 19개일 때 모두 버티는 화면이어야 함.
  - `dueDate` 전부 없음, description/checklist 있는 업무 2개뿐 → 기한 중심 UI는 비게 됨.
  - 앞 4단계는 거래 전에 ExitOS로 이미 끝낸 일 → "이미 끝낸 단계"로 보여주면 스토리가 좋다는 제안.
  - "고용 승계 협의" 문구는 고용 자동 승계로 읽힐 수 있어 "직무 인계·고용 조건 협의" 제안(C의 generate 규칙 + SKILL.md 공용이라 공지 필요).
- **열린 질문(사용자 답 대기)**: 이 화면을 여는 사람이 누구이고(판매자/구매자/둘 다), 열자마자 제일 먼저 알아야 하는 게 무엇인가 → 맨 위에 진행률을 둘지 "내가 지금 할 일"을 둘지 결정.
- 사용자가 원한 진행 방식: 데이터 확인 → **정보 위계 정리** → `ui-ux-pro-max` 스킬로 목업 → 확인 후 구현. 앞 화면들과 같은 톤(딥그린, 네모, 선 위주, 모바일 대응).

### 5-2. 리스크 보고서 `/listings/[id]/risk`
- 상세의 "리스크 보고서 보기"(승인 후) 버튼이 지금 404. 데모 2:10: "8월 현금 매출", "점주 의존도 높음", "임대차 만료" + 판매자에게 물어볼 질문. D(AI)와 데이터 형식 맞출 것. `AiEstimateNotice` 필수.

### 5-3. 규칙 위반 정리 — 출처 배지 없는 숫자
- SKILL.md "라벨 없는 숫자 금지" 위반 위치: 메인 목록의 권리금·보증금·월세, 상세 히어로 핵심 숫자 4칸(`KeyCell`), 오른쪽 패널 가격, 비슷한 매물 카드, 오른쪽 '조건 요약' 평균값. 사용자에게 고칠지 물어본 상태(답 대기).

### 5-4. 팀에 알려야 할 것 (사용자가 전달)
- 역할 전환 토글 제거: TEAM_PLAN 결정 로그·PRD §159·SKILL.md("상단 고정 RoleSwitcher")와 다름. 쿠키는 그대로라 서버 동작은 같지만 '판매자(내 매물)' 보기로 가는 길이 없음. 데모 1:40은 버튼 클릭으로 진행.
- `layout.tsx`/`globals.css` 변경(Pretendard, 딥그린, radius 0), `public/stores/` 사진 추가.

### 5-5. C에게 요청할 것
- 서버 컴포넌트용 `getViewerFromCookies()` (지금은 Request 감싸는 우회).
- 매물 조회 서버 함수 `getListing(id)` / `listListings()` (목업↔DB 전환) → `listing-source.ts` 에서 호출로 교체.
- `ListingSummary` 에 역 거리·면적·층·소개·출처 개수·사진 추가 → `listing-rows.ts` 의 `SUPPLEMENT`·`DEMO_ROWS` 제거.
- 목업 일부를 `verified` 로(지금 증빙 확인 0개라 배지 스토리가 약함).

### 5-6. 남은 자잘한 것
- 죽은 링크: "내 가게 팔기"(`/seller/diagnose`, B), "인수인계"(`/handover/mock-deal-1`, 5-1에서 해결), 검색창·관심 매물은 모양만.
- 성수동 분식 C 사진에 실제 가게처럼 보이는 네온 간판 → 필요하면 교체.
- 랜딩 페이지(따로), 발표 슬라이드(~10장), 60초 데모 영상, `docs/DEMO_SCRIPT.md` 갱신(역할 토글 → 버튼 흐름).
- 제출: 11/1 08:30까지 GitHub, 배포 URL+테스트 계정, 영상, 슬라이드.
