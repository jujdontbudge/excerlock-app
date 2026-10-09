import { base, makeRule } from './base';
import { HistoryDay } from '../../../model/models';
import { addDays } from '../../../schedule/calendar';
import { gymPlace } from '../places';

const TODAY = '2026-10-08';
const deterministicSpread = (i: number, salt: number) => ((i * 7919 + salt * 104729) % 1000) / 1000;
const days: HistoryDay[] = Array.from({ length: 61 }, (_, i) => ({
  day: addDays(TODAY, i - 60),
  usageMinutes: Math.round(150 - i * 1.6 + deterministicSpread(i, 3) * 20),
  activity: { walking: 13000 + Math.round(deterministicSpread(i, 1) * 9000), gym: 60 + Math.round(deterministicSpread(i, 2) * 60) },
  met: true,
  scheduled: true,
}));
const today = days[days.length - 1];

export const screenshotsFull = base('screenshots-full', 'Two full months for screenshots', {
  rules: [
    makeRule('walk', { kind: 'target', activity: 'walking', metric: 'steps', goal: 10000 }),
    makeRule('gym', { kind: 'target', activity: 'gym', metric: 'minutes', goal: 60 }),
  ].map((rule) => ({ ...rule, schedule: { ...rule.schedule, days: [0, 1, 2, 3, 4, 5, 6] } })),
  clock: { now: '2026-10-08T22:00:00.000Z', timezone: 'America/Chicago' },
  entitlement: { status: 'trial', renewsAt: '2026-10-15T15:00:00.000Z' },
  history: days,
  steps: { today: today.activity.walking, pastFromHistory: true },
  ruleDays: [
    { ruleId: 'walk', day: TODAY, progress: today.activity.walking, met: true, metAt: '2026-10-08T17:10:00.000Z' },
    { ruleId: 'gym', day: TODAY, progress: today.activity.gym, met: true, metAt: '2026-10-08T20:30:00.000Z' },
  ],
  usageMinutesToday: today.usageMinutes,
  gym: { places: [gymPlace], presence: 'outside', backgroundAsked: true },
  permissions: { screenTime: 'granted', motion: 'granted', location: 'always', camera: 'granted', notifications: 'granted' },
});
