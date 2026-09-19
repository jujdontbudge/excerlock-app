/**
 * StoreKit's system rating sheet. iOS decides whether the sheet actually appears
 * (it may show nothing), so the port reports what was asked, never what was shown.
 * `'failed'` means the native call rejected (no foreground scene, missing module).
 */
export type StoreReviewOutcome = 'requested' | 'failed';

export interface StoreReviewPort {
  /** False on TestFlight and dev installs, where the sheet renders but never submits. */
  isAvailable(): Promise<boolean>;
  requestReview(): Promise<StoreReviewOutcome>;
}
