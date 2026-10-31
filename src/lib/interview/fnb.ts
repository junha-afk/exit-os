// F&B(외식업) 업종 목록 (소유: A). 화면(업종 버튼)과 프롬프트가 같은 목록을 쓴다.
export const FNB_INDUSTRIES = ['카페', '베이커리·디저트', '음식점', '분식·간편식', '주점·바', '기타 외식업'] as const;
export type FnbIndustry = (typeof FNB_INDUSTRIES)[number];
