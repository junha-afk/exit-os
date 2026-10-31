// 목업 응답 (소유: B). API 실연동 전까지 라우트가 이 값을 내려준다.
// JSON 은 data/sample CSV 를 SKILL.md §2 공식으로 계산해 만든 값 — 실제 구현 후 교체.
import type {
  AnalysisResult, DealTasksResponse, HandoverTask, ListingDetail, ListingSummary,
  RecordKind, StoreFacts, UploadResult,
} from '../types';
import analysis from './analysis.json';
import dealTasks from './deal-tasks.json';
import listingDetail from './listing-detail.json';
import listings from './listings.json';
import storeFacts from './store-facts.json';
import uploadResults from './upload-results.json';
import sellerReport from './seller-report.json';
import riskReport from './risk-report.json';
import type { BuyerRiskReport, SellerReport } from '../report/types';

export const MOCK_STORE_ID = 'mock-store-mangwon';
export const MOCK_LISTING_ID = 'mock-listing-1';
export const MOCK_DEAL_ID = 'mock-deal-1';

export const mockAnalysis = analysis as AnalysisResult;
export const mockFacts = storeFacts.facts as StoreFacts;
export const mockUploadResults = uploadResults as Record<RecordKind, UploadResult>;
export const mockSellerReport = sellerReport as SellerReport;
export const mockRiskReport = riskReport as BuyerRiskReport;
export const mockListings = listings.listings as ListingSummary[];
export const mockListing = listingDetail as {
  id: string; storeId: string; premiumBreakdownLevel: 'public' | 'approved'; detail: ListingDetail;
};
// 개발 서버 메모리에서만 상태 변경이 유지된다 (재시작 시 초기화)
export const mockTasks = (dealTasks as Pick<DealTasksResponse, 'tasks'>).tasks as HandoverTask[];
