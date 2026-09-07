import { Rule, WalkingSession } from '../domain/types';
import { Unsubscribe } from './models';
export interface WalkingPort {
  start(rule: Rule, options?: { placement: 'propped' | 'handheld' }): Promise<WalkingSession>;
  stop(): void;
  completeProppedScan(): boolean;
  observe(callback: (session: WalkingSession | null) => void): Unsubscribe;
  details(): { steps: number; walkingSeconds: number; graceUntil: string | null };
  treadmillFraming(): { ready: boolean; message: string; placement: 'propped' | 'handheld' };
}
