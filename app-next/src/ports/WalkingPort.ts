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
  /** The reason travels to the session machine, which credits through the instant it names. */
  stop(reason?: WalkingSessionEndReason): void;
  completeProppedScan(): boolean;
  observe(callback: (session: WalkingSession | null) => void): Unsubscribe;
  details(): { steps: number; walkingSeconds: number; graceUntil: string | null };
  treadmillFraming(): { ready: boolean; message: string; placement: 'propped' | 'handheld' };
}
