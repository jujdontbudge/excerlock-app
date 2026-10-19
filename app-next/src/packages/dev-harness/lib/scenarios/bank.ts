import { base, makeRule } from './base';
import type { Scenario } from '../../../model/models';
const condition = {
  ...makeRule('bank', { kind: 'bank', activity: 'walking', difficulty: 'medium' }),
  createdAt: '2026-09-07T04:00:00.000Z',
  schedule: { days: [0, 1, 2, 3, 4, 5, 6] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[], window: { kind: 'allDay' as const } },
};
function bankState(points: number, pendingPoints: number, bankMinutes: number): Partial<Scenario> {
  return {
    rules: [condition],
    ruleDays: [],
    history: [],
    steps: { today: pendingPoints },
    bank: { points, pendingPoints, bankMinutes },
    fakeSystemPrompts: 'grant',
  };
}
export const bankScenarios = [
  base('bank-fresh', 'New Bank Condition', bankState(0, 0, 720)),
  base('bank-pending', 'Points waiting to collect', bankState(0, 4210, 720)),
  base('bank-routine', 'Points waiting after an earlier Collect', bankState(11220, 3960, 192)),
  base('bank-rich', 'Points for every Offer', bankState(33000, 0, 720)),
  base('bank-showcase', 'Showcase account with 17 m left', { ...bankState(12000, 0, 17), showcase: true }),
  base('bank-empty', 'Empty Bank with Points', bankState(3300, 0, 0)),
  base('bank-broke', 'Empty Bank with too few Points', bankState(300, 0, 0)),
  base('bank-before-midnight', 'Bank before a new Day', {
    ...bankState(0, 0, 720),
    clock: { now: '2026-09-08T03:54:00.000Z', timezone: 'America/New_York' },
  }),
  base('bank-onboarding', 'Bank Onboarding choice', {
    rules: [],
    ruleDays: [],
    history: [],
    onboarding: 'resumeAt:W2',
    onboardingAnswers: { activity: 'walking', walkingMode: 'state', name: 'Alex' },
    steps: { today: 0 },
    fakeSystemPrompts: 'grant',
  }),
];
