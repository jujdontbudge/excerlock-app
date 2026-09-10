import { Rule } from '../domain/types';
import { Unsubscribe } from './models';
export type WalkingStatus = {
  ruleId: string | null;
  phase: 'inactive' | 'verifying' | 'active' | 'grace' | 'unknown';
  since: string | null;
  placement: 'propped' | 'handheld' | 'unknown';
  proppedVerified: boolean;
  proppedSince: string | null;
};
export const inactiveWalkingStatus: WalkingStatus = { ruleId: null, phase: 'inactive', since: null, placement: 'unknown', proppedVerified: false, proppedSince: null };
export interface WalkingPort {
  start(rule: Rule, options?: { placement: 'propped' | 'handheld' }): Promise<WalkingStatus>;
  /** Runs the bounded three-second foreground manual check. */
  check(rule: Rule): Promise<boolean>;
  stop(): void;
  completeProppedScan(): boolean;
  snapshot(): WalkingStatus;
  observe(callback: () => void): Unsubscribe;
  /** Raw/manual-check observation only. Canonical policy remains the persisted reducer. */
  observeWalking(callback: (walking: boolean) => void): Unsubscribe;
  details(): { steps: number; walkingSeconds: number };
  treadmillFraming(): { ready: boolean; message: string; placement: 'propped' | 'handheld' };
}
