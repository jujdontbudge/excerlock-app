import { Rule, WalkingSession, WalkingSessionEndReason } from '../domain/types';
import { Unsubscribe } from './models';

export type WalkingStartErrorCode = 'invalidRule' | 'notScheduled';

export class WalkingStartError extends Error {
  readonly code: WalkingStartErrorCode;
  constructor(code: WalkingStartErrorCode) {
    super(code);
    this.name = 'WalkingStartError';
    this.code = code;
  }
}
export interface WalkingPort {
  start(rule: Rule, options?: { placement: 'propped' | 'handheld' }): Promise<WalkingSession>;
  /** The reason is the session machine's end reason; the root guard names why it tore the session down. */
  stop(reason?: WalkingSessionEndReason): void;
  completeProppedScan(): boolean;
  observe(callback: (session: WalkingSession | null) => void): Unsubscribe;
  details(): { steps: number; walkingSeconds: number; graceUntil: string | null };
  /** No Phase-1 caller: the walk sheet is handheld only. Kept as P2-T05's pickup-detection input. */
  treadmillFraming(): { ready: boolean; message: string; placement: 'propped' | 'handheld' };
}
