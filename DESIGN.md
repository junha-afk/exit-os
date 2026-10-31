# ExitOS 디자인 가이드

담당: **A** · 기준 코드: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/common/**`
모든 화면(A 구매자·인수인계, B 판매자 진단·보고서)은 이 문서의 폰트·색·모양을 따른다. 바꾸고 싶으면 A에게 먼저 말한다.

> 한 줄 원칙: **흰 바탕에 선으로 나누고, 색은 딥그린 하나와 의미색(출처·경고)만 쓴다. 모서리는 각지게.**

---

## 1. 톤

- **신뢰감 있는 금융·부동산 서비스.** 장식보다 숫자와 출처가 먼저 보이게.
- 참고한 곳: 네모(상가 매물 목록), 알바몬(폴더 탭·하단 고정 버튼), BizBuySell·Empire Flippers(매물 상세 구성).
- **피할 것 (AI 티):** 그라데이션 배경, 보라·파랑 조합, 이모지 아이콘, 아이콘 넣은 3칸 카드 그리드, 모든 걸 가운데 정렬, 둥근 카드, 장식용 그림자·블롭.

---

## 2. 폰트

| 용도 | 폰트 | 적용 |
|---|---|---|
| 본문·제목 전부 | **Pretendard Variable** | `layout.tsx` 에서 CDN(jsdelivr, v1.3.9 dynamic subset)으로 불러옴. `--font-sans`, `--font-heading` |
| 코드·ID | Geist Mono | `--font-mono` |

- 숫자(금액·비율·개수·날짜)는 항상 **`tabular-nums`** (자릿수 정렬).
- 별도 폰트 설치 금지(패키지 설치는 C만). 다른 폰트를 쓰지 않는다.

**크기 (Tailwind 기준, 실제 쓰는 값)**

| 역할 | 크기 / 굵기 | 예 |
|---|---|---|
| 페이지 제목 (h1) | 데스크톱 32px · 모바일 20~26px / bold, `tracking-tight` | 매장명, "매물 찾기" |
| 섹션 제목 (h2) | `text-2xl`(24px) / bold | "매각 가격", "비슷한 매물" |
| 소제목 (h3) | `text-sm`(14px) / semibold | "권리금 구성", "최근 12개월 추이" |
| 핵심 숫자 | `text-3xl`(30px) lg · `text-2xl` md · `text-lg`(18px) 목록 / bold | 권리금 1억 6,000만 원 |
| 본문 | 15~16px / regular, `leading-relaxed` | 소개 문구 |
| 보조 설명 | `text-sm`(14px) · `text-[13px]` / `text-muted-foreground` | 업종 · 역 · 개업 연수 |
| 라벨·캡션 | `text-xs`(12px) | 지표 라벨, 각주 |

- 12px 미만 금지(모바일 탭바 11px만 예외).

---

## 3. 색

토큰은 `globals.css` 의 `:root` 에 있다. **컴포넌트에 hex 직접 쓰지 말고 토큰 클래스**(`bg-primary`, `text-muted-foreground`, `border` …)를 쓴다. 예외는 Recharts 색(아래 참고).

### 3-1. 기본 팔레트

| 토큰 | 값 (oklch) | 대략 hex | 쓰는 곳 |
|---|---|---|---|
| `--primary` | 0.36 0.07 163 | `#0E4832` | **딥그린.** 주요 버튼, 로고, 선택된 칩·메뉴 밑줄, 판매자 배너 배경 |
| `--primary-foreground` | 0.985 0 0 | `#FAFAFA` | primary 위 글자 |
| `--accent` | 0.965 0.014 163 | `#ECF7F1` | **연한 회녹.** 페이지 머리 띠, 선택 배경, 아바타 바탕 |
| `--accent-foreground` | 0.3 0.06 163 | `#063725` | accent 위 글자 |
| `--background` | 1 0 0 | `#FFFFFF` | 페이지 바탕(기본은 흰색) |
| `--foreground` | 0.145 0 0 | `#0A0A0A` | 본문 글자 |
| `--muted` | 0.968 0.003 163 | `#F3F5F4` | 비선택 탭 바탕, 바닥글, 사진 자리 |
| `--muted-foreground` | 0.556 0 0 | `#737373` | 보조 글자 |
| `--border` | 0.922 0 0 | `#E5E5E5` | 모든 구분선·테두리 |
| `--ring` | 0.55 0.09 163 | `#378262` | 키보드 포커스 테두리 |

- 한 화면에 **딥그린 덩어리(배경으로 칠한 면)는 1개까지**(예: 판매자 배너, 주 버튼). 나머지는 선과 글자.
- 회색은 차가운 무채색 하나로 통일(따뜻한 베이지 섞지 않기).

### 3-2. 의미색 (바꾸지 않는다)

| 의미 | 색 | 클래스 예 | 쓰는 곳 |
|---|---|---|---|
| 🟢 증빙 확인 `verified` | emerald | `border-emerald-200 bg-emerald-50 text-emerald-800`, 점 `bg-emerald-500` | 출처 배지 |
| 🔵 사용자 입력 `user_input` | sky | `border-sky-200 bg-sky-50 text-sky-800`, 점 `bg-sky-500` | 출처 배지 |
| 🟠 확인 필요 `needs_check` | amber | `border-amber-300 bg-amber-50 text-amber-900`, 점 `bg-amber-500` | 출처 배지, 경고 문구(`text-amber-700`) |
| 위험도 high | red | `bg-red-50 text-red-800 ring-red-200` | 리스크 태그 |
| 위험도 medium | amber | `bg-amber-50 text-amber-900 ring-amber-200` | 리스크 태그 |
| 위험도 low | slate | `bg-slate-50 text-slate-700 ring-slate-200` | 리스크 태그 |
| 오류 | `--destructive` | `text-destructive` | 폼 오류 |

- 색만으로 뜻을 전하지 않는다. 배지는 항상 **아이콘 + 글자**(`ShieldCheck`/`PencilLine`/`AlertTriangle`).

### 3-3. 차트

Tailwind v4는 쓰지 않은 색 변수를 CSS에 넣지 않으므로 **Recharts에는 hex** 를 쓴다.

| 요소 | 색 |
|---|---|
| 기본 막대 | `#CBD5E1` (slate-300) |
| 확인 필요한 달 | `#FBBF24` (amber-400) |
| 이익 선 | `#1E293B` (slate-800) |
| 격자 | `var(--border)` |

범례를 항상 붙이고, 애니메이션은 끈다(`isAnimationActive={false}`).

---

## 4. 모양

- **둥근 모서리 사각형 금지.** `--radius: 0` 이라 shadcn 컴포넌트도 각지게 나온다. `rounded-md/lg/xl` 쓰지 않기.
- **예외(둥글게 유지):** 켜기/끄기 스위치, 작은 점(출처·범례 dot), 원형 자물쇠 아이콘.
- 테두리는 1px `border`. 굵은 테두리·색 있는 왼쪽 테두리 금지.
- 그림자는 띄워야 하는 것(내 정보 메뉴, 서랍)에만 `shadow-lg`. 카드에 장식용 그림자 금지.
- 카드는 "누를 수 있는 단위"일 때만(매물 카드). 정보 묶음은 박스 대신 **위아래 선(`border-y`)** 으로 나눈다.

---

## 5. 레이아웃

| 항목 | 값 |
|---|---|
| 최대 폭 | `max-w-6xl` (1152px) |
| 좌우 여백 | 모바일 `px-4`, 데스크톱 `md:px-6` |
| 헤더 높이 | 모바일 56px(`h-14`), 데스크톱 64px(`md:h-16`), 위에 고정 |
| 본문 + 오른쪽 패널 | 메인 `lg:grid-cols-[1fr_300px]`, 상세 `lg:grid-cols-[1fr_320px]`, 패널은 `lg:sticky lg:top-24` |
| 섹션 간격 | `gap-10`(40px) |
| 간격 단위 | 4px 배수(Tailwind 기본 스케일)만 |
| 반응형 기준 | `md`(768) 에서 모바일↔데스크톱 헤더 전환, `lg`(1024) 에서 오른쪽 패널 등장 |

**모바일 규칙**
- 주 메뉴는 **하단 탭바**(`MobileTabBar`: 매물/관심/내 가게 팔기/인수인계). 헤더는 로고·검색·내 정보만.
- 상세 화면은 탭바 대신 **하단 고정 바**(가격 + 다음 행동 버튼), 본문 아래 여백 `pb-28`.
- 사진은 화면 폭 꽉 차게 **좌우로 넘기기**(+ "1 / 5" 표시). 칩·사진 줄은 `.no-scrollbar`.
- 누를 수 있는 것은 높이 **44px 이상**(`min-h-11`), 주요 버튼 48px(`min-h-12`).
- 페이지 가로 스크롤이 생기면 안 된다.

---

## 6. 컴포넌트 (`src/components/common`)

| 컴포넌트 | 쓰는 법 |
|---|---|
| `SiteHeader` | 모든 페이지 맨 위. `active`(현재 메뉴), 목록은 `onMenuClick`(☰), 상세는 `backHref` |
| `SiteFooter`, `MobileTabBar` | 페이지 맨 아래. 상세처럼 하단 고정 바가 있는 화면은 탭바 생략 |
| `Metric` | **숫자는 이걸로.** `sourced` 또는 `value`+`provenance` 필수, `format`: krw/percent/months/number |
| `ProvenanceBadge` | 출처 배지. 좁은 곳은 `compact` |
| `LockedSection` | 서버가 준 `{locked, level}` 을 블러+자물쇠로. 값은 받지 않는다 |
| `AiEstimateNotice` | AI 추정(가치·리스크·회수 기간)이 보이는 화면에 필수 |
| `useMembership()` | 구독·열람 승인 상태 바꾸기(역할 고르는 UI는 만들지 않는다) |
| `ROUTES` (`routes.ts`) | 화면 이동 주소. 주소 문자열을 직접 쓰지 않는다 |

**버튼**
- 주 버튼: `bg-primary text-primary-foreground min-h-12 font-semibold` (화면당 하나)
- 보조 버튼: `border bg-background`
- 문구는 하는 일을 그대로: "구독하고 열람하기", "열람 승인 요청하기", "가치 진단 시작". "확인"·"제출" 같은 막연한 말 금지.

**탭 (상세)** — 알바몬식 폴더 탭: 붙은 네모 칸, 비선택 `bg-muted text-muted-foreground`, 선택 `bg-background font-bold` + 아래 테두리 없음. 탭 아래 섹션 제목은 박스 **밖**에 크게.

**목록** — 카드 그리드 대신 **세로 목록 + 구분선**(`divide-y`). 한 줄: 사진(좌) / 업종·역·개업 → 매장명 → **권리금** → 보증금·월세·평·층 → 소개 → 출처 점.

---

## 7. 글쓰기

- 한국어, 해요체, 짧게. 시스템 용어 대신 사용자가 아는 말("공개 범위 필터" ✕ → "구독하면 볼 수 있어요" ○).
- 금액: `formatKRW` 사용 → "1억 6,000만 원", 목록처럼 좁은 곳은 단위 생략 "1억 6,000만". 비율 "38.7%", 기간 "17.6개월".
- 빈 화면은 이유 + 다음 행동("조건에 맞는 매물이 없어요. 조건 초기화").
- 판매자 자료에서 나온 숫자는 단정하지 않는다. 추정치에는 `AiEstimateNotice`.

---

## 8. 접근성 체크

- 키보드 포커스 테두리(`focus-visible:outline-ring`)를 지우지 않는다.
- 아이콘만 있는 버튼은 `aria-label`. 장식 아이콘은 `aria-hidden`.
- 이미지는 `alt`("{매장명} 매장 사진 N").
- 본문 대비 4.5:1 이상(회색 글자는 `text-muted-foreground` 이하로 연하게 하지 않기).

---

## 9. 바꿀 때

- 색·폰트·모서리 규칙 변경 → A와 상의 후 이 문서와 `globals.css` 를 같이 고친다.
- 새 공통 컴포넌트는 `src/components/common` 에 두고 6장 표에 한 줄 추가.
