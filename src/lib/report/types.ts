// 보고서 응답 타입 (소유: B). 키 이름은 docs/AI_PROMPTS.md §3~§5 의 LLM 출력 스키마와 같다.

// POST /api/ai/report → SellerReport (AI_PROMPTS §4)
export interface SellerReport {
  headline: string;           // 30자 이내. 판매 페이지 매장 소개로도 쓰인다
  summary: string;            // 3문장
  sections: {
    pnl: string; assets: string; operations: string; contracts: string;
    risks: string[]; strengths: string[];
  };
  seller_todo: string[];      // 매각 전 보완하면 가치가 오르는 행동
}

export type RiskLevel = 'low' | 'medium' | 'high';

// POST /api/ai/risk → BuyerRiskReport (AI_PROMPTS §5). viewer 필터를 통과한 정보로만 만든다
export interface BuyerRiskReport {
  overall: { level: RiskLevel; one_liner: string };
  risks: { title: string; level: RiskLevel; why: string; question_to_seller: string }[];
  value_opinion: string;      // 코드가 계산한 Valuation 범위를 인용
  due_diligence_checklist: string[];
}

// 이상치 설명 (AI_PROMPTS §3). index = AnalysisResult.anomalies 의 순서
export interface AnomalyExplanations {
  items: { index: number; explanation: string; evidence_to_submit: string }[];
}
