# ExitOS 해커톤 팀 플랜 (4인 · 7시간)

## 역할 & 소유권

**파일 소유권 원칙:** 자기 폴더만 수정한다. 남의 폴더가 필요하면 담당자에게 요청하거나, 새 파일을 만들어 import 하게 한다. 공용 파일(`types.ts`, `visibility.ts`, `package.json`)은 수정 전 채널 공지.

| 역할 | 담당 | 소유 경로 | 핵심 산출물 |
| --- | --- | --- | --- |
| **A. PM·디자인·구매자 화면** | 피치, 데모 시나리오, 공통 컴포넌트, 구매자·인수인계 화면 | `src/app/page.tsx`, `src/app/listings/**`, `src/app/handover/**`, `src/components/common/**`, `src/lib/format.ts`, `docs/DEMO_SCRIPT.md` | 매물 목록, 판매 페이지(게이팅 UI), 리스크 보고서 화면, 인수인계 대시보드, 발표 자료 |
| **B. 판매자 프론트** | 판매자 플로우 UI | `src/app/seller/**`, `src/components/interview/**`, `src/components/report/**` | 진단 채팅 + 실시간 추출 패널, CSV 업로드 UI, 보고서 화면, 회수기간 시뮬레이터, 차트 |
| **C. 백엔드·데이터** | DB, API, 계산 로직 | `src/app/api/**` (ai 제외), `src/lib/{types,visibility,supabase}.ts`, `src/lib/analysis/**`, `src/lib/handover/**`, `supabase/**`, `data/**` | 스키마, 업로드·정규화·중복 제거, 지표·점수·가치 계산, 공개 범위 필터, deal/task API |
| **D. AI** | Gemini 연동, 프롬프트 | `src/app/api/ai/**`, `src/lib/ai/**`, `docs/AI_PROMPTS.md` | 인터뷰 엔진, 이상치 설명, 보고서/리스크 생성, 인수인계 보강, DEMO_MODE fixture |

**공용 파일 담당 (충돌 방지):**
- 앱 셸 `src/app/layout.tsx`, `src/app/globals.css` → **A**. 다른 사람은 내비·전역 스타일 변경을 A에게 요청한다.
- 설정 `package.json`, `package-lock.json`, `next.config.*`, `tailwind.config.*`, `components.json` → **C**. 셋업 이후 `npm i` · `npx shadcn add` 는 C만 실행한다(lockfile 충돌 방지). 필요한 패키지·컴포넌트는 C에게 요청한다.
- 목업 응답 `src/lib/mocks/*.json` → **C**.

## 타임라인

| 시간 | 전원 / A | B | C | D |
| --- | --- | --- | --- | --- |
| **0:00–0:30** 셋업 | C가 리포 생성·`create-next-app`·shadcn·Supabase 프로젝트·schema 실행·`.env` 공유. 전원 PRD 5분 읽기, 데모 시나리오 합의 | 설치 확인 | 리포/DB 셋업 | Gemini 키 발급·호출 테스트 |
| **0:30–1:30** 계약 고정 | A: 공통 컴포넌트(`Metric`, `ProvenanceBadge`, `LockedSection`, `RoleSwitcher`, `AiEstimateNotice`) | 진단 페이지 레이아웃(채팅 좌/패널 우), 목업 JSON 연결 | `types.ts`, `visibility.ts`, 모든 API **목업 응답**으로 오픈, `mocks/*.json` 커밋 | `gemini.ts` 래퍼 + 인터뷰 프롬프트 v1 |
| **1:30–4:00** 병렬 개발 | 판매 페이지 + 게이팅, 매물 목록, 인수인계 대시보드 | 인터뷰 UI 실연동, CSV 업로드, 보고서 화면, 시뮬레이터 | CSV 파싱·중복 제거·출처 판정·지표·이상치·점수·가치, listing/deal/task API, `generate.ts` | 인터뷰 실연동, 이상치 설명, 판매자 보고서 → 리스크 보고서 |
| **4:00** 🔔 체크포인트 | 15분 스탠드업: P0 E2E 한 번 통과했나? 안 됐으면 P1 포기하고 P0만 | | | |
| **4:00–5:30** 통합 | 데모 시나리오 따라 E2E, 버그 리스트 공유 | 버그 수정 | 버그 수정, 시드 데이터 | 리스크 보고서·인수인계 보강, fixture 녹화 |
| **5:30–6:30** 폴리시 | 발표 자료, 스크린샷 | UI 다듬기, (여유 시) 노하우 인터뷰·PDF | 배포(Vercel), 환경변수 | `DEMO_MODE` 검증 |
| **6:30–7:00** 리허설 | 데모 2회 리허설(1회는 DEMO_MODE), 코드 프리즈 | | | |

**코드 프리즈: 6:30.** 이후에는 데모를 깨는 버그만 수정.

### 셋업 메모 (C)
`exitos/` 에 이미 문서가 있어서 `create-next-app` 이 "충돌 파일" 오류를 낼 수 있다. 옆 폴더에 생성한 뒤 옮긴다:
```bash
npx create-next-app@latest exitos-app --ts --tailwind --app --src-dir --eslint --use-npm
```
```bash
cp -rn exitos-app/. exitos/ && rm -rf exitos-app
```
```bash
cd exitos && git init && npx shadcn@latest init
```
Node가 없으면 WSL에서 nvm으로 Node 20+ 설치 후 진행.

## Git 규칙

- `main` 은 항상 빌드되는 상태. 각자 `feat/<역할>-<기능>` 브랜치 → 작게 자주 PR/머지 (최소 1시간에 1번).
- 머지 전 `npm run build` 통과.
- 커밋 메시지: `[A] 판매 페이지 잠금 섹션` 처럼 역할 접두사.
- `package.json` 의존성 추가는 채널에 공지(lockfile 충돌 방지). 가능하면 셋업 단계에서 한 번에 설치:
  ```bash
  npm i @supabase/supabase-js @google/genai zod papaparse recharts lucide-react
  ```
  ```bash
  npm i -D @types/papaparse
  ```

## Claude Code 사용 규칙

- 모든 팀원은 `exitos` 폴더에서 Claude Code를 연다 → `CLAUDE.md` 와 `.claude/skills/exitos/SKILL.md` 가 자동으로 적용된다.
- 새 작업을 시킬 때 "내 역할은 B, 소유 경로 밖은 수정하지 마" 처럼 **역할을 먼저 말한다**.
- 공용 계약(타입·API)을 바꾸는 제안이 나오면 바로 적용하지 말고 채널에 공지 후 C가 반영.

## 결정 로그

결정이 생기면 여기 한 줄씩 추가 (누가·언제·무엇).

- 2026-10-31 · 전원 · 인증 대신 역할 전환 토글(`demo_role` 쿠키)로 시연
- 2026-10-31 · 전원 · CSV만 지원, 고정 템플릿 6종
