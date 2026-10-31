# ExitOS — Claude Code 작업 지침

소상공인 매각 준비·인수인계 자동화 SaaS. 4인 팀, 7시간 해커톤.

## 먼저 읽을 것
- 제품 요구사항: `PRD.md`
- 도메인 규칙·구현 컨벤션: `.claude/skills/exitos/SKILL.md` ← **코드 작성 전 반드시 적용**
- 타입·API·폴더·CSV 계약: `docs/ARCHITECTURE.md`
- 역할·파일 소유권·타임라인: `docs/TEAM_PLAN.md`
- Gemini 프롬프트: `docs/AI_PROMPTS.md`
- 데모 기준(이것만 만든다): `docs/DEMO_SCRIPT.md`

## 스택
Next.js 15 App Router + TypeScript · Tailwind + shadcn/ui · Recharts · Supabase(Postgres) · Gemini(`@google/genai`) · zod · papaparse

## 명령어
- 개발 서버: `npm run dev`
- 빌드 체크(머지 전 필수): `npm run build`
- 샘플 데이터 재생성: `node data/generate-sample.mjs`
- DB 스키마: Supabase SQL Editor에서 `supabase/schema.sql` 실행

## 규칙
1. 사용자가 밝힌 역할(A/B/C/D)의 **소유 경로 밖 파일은 수정하지 않는다**. 필요하면 변경 제안만 출력한다.
2. `src/lib/types.ts`, `src/lib/visibility.ts`, `package.json` 변경은 "팀 공지 필요"라고 사용자에게 알린다.
3. 숫자는 출처 라벨과 함께, 공개 범위는 서버에서 필터, 돈 계산은 코드로, AI 추정에는 고지 문구 (SKILL.md §1).
4. 시크릿(`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)은 서버 코드에서만. `NEXT_PUBLIC_` 금지.
5. 데모 시나리오에 없는 기능, 과한 추상화, 테스트 인프라 구축은 하지 않는다. 계산 함수에만 가벼운 테스트.
6. UI 문구와 문서는 한국어, 코드 식별자는 영어.
