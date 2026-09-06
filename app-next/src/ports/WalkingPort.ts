import { Rule, WalkingSession } from '../domain/types';
import { Unsubscribe } from './models';
export interface WalkingPort {
  start(rule: Rule): Promise<WalkingSession>;
  stop(): void;
  observe(callback: (session: WalkingSession | null) => void): Unsubscribe;
  details(): { steps: number; walkingSeconds: number; graceUntil: string | null };
  treadmillFraming(): { ready: boolean; message: string; placement: 'propped' | 'handheld' };
}
