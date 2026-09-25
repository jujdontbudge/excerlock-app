export type StoreReviewOutcome = 'requested' | 'failed';

export interface StoreReviewPort {
  isAvailable(): Promise<boolean>;
  requestReview(): Promise<StoreReviewOutcome>;
}
