# ExitOS — Claude Code 작업 지침

소상공인 매각 준비·인수인계 자동화 SaaS. 해커톤 팀 작업. 역할: **A(정보 수집)**, **B(분석·보고서)**, **F(플랫폼 프론트)**.

## 먼저 읽을 것
- 제품 요구사항: `PRD.md`
- 도메인 규칙·구현 컨벤션: `.claude/skills/exitos/SKILL.md` ← **코드 작성 전 반드시 적용**
- 타입·API·폴더·CSV 계약: `docs/ARCHITECTURE.md`
- 역할·파일 소유권·타임라인: `docs/TEAM_PLAN.md`
- LLM 프롬프트: `docs/AI_PROMPTS.md`
- 화면 디자인 규칙: `DESIGN.md`
- 데모 기준(이것만 만든다): `docs/DEMO_SCRIPT.md`

## 스택
Next.js 15 App Router + TypeScript · Tailwind + shadcn/ui · Recharts · Supabase(Postgres) · 래블업 LLM API(`src/lib/ai/llm.ts`, `fetch` 호출) · zod · papaparse

## 명령어
- 개발 서버: `npm run dev`
- 빌드 체크(머지 전 필수): `npm run build`
- 샘플 데이터 재생성: `node data/generate-sample.mjs`
- DB 스키마: Supabase SQL Editor에서 `supabase/schema.sql` 실행

## 규칙
1. 사용자가 밝힌 역할(A/B/F)의 **소유 경로 밖 파일은 수정하지 않는다** (`docs/TEAM_PLAN.md` §2). 필요하면 변경 제안만 출력한다.
2. `src/lib/types.ts`, `src/lib/visibility.ts`, `package.json` 변경은 "팀 공지 필요"라고 사용자에게 알린다.
3. 숫자는 출처 라벨과 함께, 공개 범위는 서버에서 필터, 돈 계산은 코드로, AI 추정에는 고지 문구 (SKILL.md §1).
4. 정보 수집은 숫자·선택 입력과 파일만 받는다(자유 문장 입력 없음). 받을 자료는 LLM이 판단해 요청하고, 파일은 형식과 상관없이 LLM이 내용을 읽어 반영한다. LLM은 적힌 값을 옮겨 적기만 하고 계산은 코드가 한다 (TEAM_PLAN.md §1).
5. 시크릿(`LABLUP_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)은 서버 코드에서만. `NEXT_PUBLIC_` 금지.
6. 데모 시나리오에 없는 기능, 과한 추상화, 테스트 인프라 구축은 하지 않는다. 계산 함수에만 가벼운 테스트.
7. UI 문구와 문서는 한국어, 코드 식별자는 영어.
