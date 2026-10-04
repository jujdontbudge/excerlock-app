import { Rule } from '../model/types';
import { Unsubscribe } from '../model/models';
export type WalkingStatus = {
  ruleId: string | null;
  phase: 'inactive' | 'verifying' | 'active' | 'grace' | 'unknown';
  since: string | null;
  placement: 'propped' | 'handheld' | 'unknown';
  proppedVerified: boolean;
  proppedSince: string | null;
  proppedEligibleUntil: number | null;
};
export const inactiveWalkingStatus: WalkingStatus = {
  ruleId: null,
  phase: 'inactive',
  since: null,
  placement: 'unknown',
  proppedVerified: false,
  proppedSince: null,
  proppedEligibleUntil: null,
};
export interface WalkingPort {
  start(rule: Rule, options?: { placement: 'propped' | 'handheld' }): Promise<WalkingStatus>;
  check(rule: Rule): Promise<boolean>;
  stop(): void;
  completeProppedScan(): boolean | Promise<boolean>;
  snapshot(): WalkingStatus;
  observe(callback: () => void): Unsubscribe;
  observeWalking(callback: (walking: boolean) => void): Unsubscribe;
  details(): { steps: number; walkingSeconds: number };
  treadmillFraming(): { ready: boolean; message: string; placement: 'propped' | 'handheld' };
}
