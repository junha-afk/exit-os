// 래블업 LLM 클라이언트 (소유: A). 모든 LLM 호출은 이 파일의 chatJson 하나로만 한다. B는 import 만.
// 서버 전용: route handler·서버 함수에서만 import 한다. 키는 LABLUP_API_KEY (NEXT_PUBLIC_ 금지).
// API: OpenAI 호환 POST {LABLUP_API_BASE_URL}/chat/completions (2026-10-31 실호출로 확인)
// 모델(DeepSeek 계열)은 답하기 전에 reasoning 을 생성한다. reasoning 이 max_tokens 를 다 쓰면 content 가 비므로
// 빠른 응답이 필요한 호출(질문 엔진)은 thinking: false, 긴 서술(보고서)은 thinking: true + 넉넉한 maxTokens.
import type { z } from 'zod';

// 모든 호출의 시스템 프롬프트 맨 앞에 자동으로 붙는 공통 머리말. 원문은 docs/AI_PROMPTS.md §공통과 같다.
export const COMMON_SYSTEM_PROMPT = `너는 소상공인 매장 양도를 돕는 ExitOS의 AI 분석가다.
- 한국어 존댓말, 짧고 구체적으로.
- 반드시 JSON 객체 하나만 출력한다. 설명 문장이나 코드 블록 표시를 붙이지 않는다.
- 제공된 숫자를 절대 바꾸거나 새로 계산하지 않는다. 숫자가 필요하면 입력에 있는 값만 인용한다.
- 법률·세무 판단을 단정하지 않는다. "확인이 필요합니다", "전문가 확인을 권장합니다"로 표현한다.
- 입력에 없는 사실을 지어내지 않는다. 모르면 "자료 없음"이라고 쓴다.`;

export interface ChatJsonOptions<T> {
  /** 미리 작성해 둔 작업별 시스템 프롬프트 (예: src/lib/interview/prompts.ts). 앞에 COMMON_SYSTEM_PROMPT 가 붙는다 */
  system: string;
  /** 이번 호출의 데이터만 (보통 JSON.stringify 한 입력). 지시문은 system 에 둔다 */
  user: string;
  /** 사진·스캔 문서 (data URL, 예: 'data:image/jpeg;base64,...'). 모델이 이미지를 직접 읽는다 (2026-10-31 확인) */
  images?: string[];
  schema: z.ZodType<T>;
  /** DEMO_MODE=true 이면 호출 없이 이 값을 그대로 돌려준다 */
  fixture?: T;
  temperature?: number;
  /** 모델의 사전 추론(reasoning) 사용 여부. 기본 false (빠름) */
  thinking?: boolean;
  /** 응답 최대 토큰. reasoning 토큰도 여기에 포함된다 */
  maxTokens?: number;
  /** 1회 요청 제한 시간(ms) */
  timeoutMs?: number;
}

export type LlmErrorCode = 'AI_CONFIG_MISSING' | 'AI_SCHEMA_FAIL';

export class LlmError extends Error {
  code: LlmErrorCode;
  constructor(code: LlmErrorCode, message: string) {
    super(message);
    this.name = 'LlmError';
    this.code = code;
  }
}

const ATTEMPTS = 2; // 실패 시 1회 재시도

export async function chatJson<T>(opts: ChatJsonOptions<T>): Promise<T> {
  if (process.env.DEMO_MODE === 'true' && opts.fixture !== undefined) return opts.fixture;

  const base = process.env.LABLUP_API_BASE_URL?.replace(/\/+$/, '');
  const key = process.env.LABLUP_API_KEY;
  const model = process.env.LABLUP_MODEL;
  if (!base || !key || !model) {
    throw new LlmError('AI_CONFIG_MISSING', 'LABLUP_API_BASE_URL / LABLUP_API_KEY / LABLUP_MODEL 이 비어 있습니다.');
  }

  const thinking = opts.thinking ?? false;
  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: `${COMMON_SYSTEM_PROMPT}\n\n${opts.system}` },
      {
        role: 'user',
        content: opts.images?.length
          ? [
              { type: 'text', text: opts.user },
              ...opts.images.map((url) => ({ type: 'image_url', image_url: { url } })),
            ]
          : opts.user,
      },
    ],
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? (thinking ? 4000 : 1000),
    response_format: { type: 'json_object' },
    // 템플릿마다 키 이름이 달라 두 가지를 함께 보낸다 (모르는 키는 무시됨)
    chat_template_kwargs: { thinking, enable_thinking: thinking },
  });

  let lastProblem = '';
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(opts.timeoutMs ?? (thinking ? 60_000 : 20_000)),
      });
      if (!res.ok) {
        lastProblem = `HTTP ${res.status}`;
        if (res.status === 401 || res.status === 403) break; // 키 문제는 재시도해도 같다
        continue;
      }
      const data = await res.json();
      const choice = data?.choices?.[0];
      const content: string | null | undefined = choice?.message?.content;
      if (!content) {
        lastProblem = `빈 응답 (finish_reason=${choice?.finish_reason ?? '?'})`;
        continue;
      }
      const parsed = opts.schema.safeParse(parseJsonLoose(content));
      if (parsed.success) return parsed.data;
      lastProblem = `스키마 불일치: ${parsed.error.issues[0]?.message ?? ''}`;
    } catch (e) {
      lastProblem = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }
  }
  // 호출부에서 폴백 처리 (질문 엔진: slots.ts 기본 질문 / 보고서: 폴백 문구)
  throw new LlmError('AI_SCHEMA_FAIL', `LLM 응답을 사용할 수 없습니다 (${lastProblem})`);
}

// 코드 블록(```json) 이나 앞뒤 설명이 붙어 와도 첫 { ~ 마지막 } 를 읽는다
function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}
