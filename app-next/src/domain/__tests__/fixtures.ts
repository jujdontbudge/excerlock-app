import { Rule, WalkingSession } from '../types';
export const rule: Rule = {
  id: 'walk',
  activity: 'walking',
  mode: { kind: 'target', activity: 'walking', metric: 'steps', goal: 5000, place: 'outside' },
  schedule: { days: [1, 2, 3, 4, 5], window: { kind: 'range', startMinute: 540, endMinute: 1260 } },
  enabled: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

/** A live handheld walking session; override only the fields a test is about. */
export const walkingSession = (over: Partial<WalkingSession> = {}): WalkingSession => ({
  id: 'session',
  ruleId: 'walk',
  placement: 'handheld',
  instanceDay: '2026-09-07',
  startedAt: '2026-09-07T19:00:00Z',
  verifiedAt: '2026-09-07T19:00:00Z',
  leaseUntil: '2026-09-07T19:15:00Z',
  creditedThrough: '2026-09-07T19:00:00Z',
  endedAt: null,
  endReason: null,
  graceUntil: null,
  phase: 'walking',
  ...over,
});
