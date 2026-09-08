import { Scenario, HistoryDay } from '../../ports/models';
import { Rule, RuleMode } from '../../domain/types';
import { addDays } from '../../domain/calendar';
export const NOW = '2026-09-07T15:00:00.000Z';
export const makeRule = (
  id = 'walk',
  mode: RuleMode = { kind: 'target', activity: 'walking', metric: 'steps', goal: 5000, place: 'outside' },
): Rule => ({
  id,
  activity: mode.activity,
  mode,
  schedule: { days: [1, 2, 3, 4, 5], window: { kind: 'range', startMinute: 540, endMinute: 1260 } },
  enabled: true,
  createdAt: '2026-08-01T12:00:00.000Z',
  updatedAt: NOW,
});
export const history = (): HistoryDay[] =>
  Array.from({ length: 42 }, (_, i) => {
    const day = addDays('2026-09-07', i - 41),
      weekday = new Date(day + 'T12:00:00Z').getUTCDay(),
      scheduled = weekday !== 0 && weekday !== 6;
    return {
      day,
      usageMinutes: Math.max(25, 160 - i * 2 + (i % 5) * 8),
      activity: {
        walking: 2400 + (i % 7) * 650,
        gym: i % 3 === 0 ? 35 : 0,
        running: i % 4 === 0 ? 25 : 0,
        biking: i % 6 === 0 ? 40 : 0,
      },
      met: scheduled && i % 6 !== 0,
      scheduled,
    };
  });
export function base(id: string, title: string, overrides: Partial<Scenario> = {}): Scenario {
  return {
    id,
    title,
    onboarding: 'complete',
    profile: {
      name: 'Alex',
      referralSource: 'friend',
      ageBand: '25-34',
      occupation: 'employed',
      improveFirst: 'screenTime',
      mainReason: 'focus',
      estimatedDailyMinutes: 180,
      units: 'mi',
    },
    rules: [makeRule()],
    lockedApps: { handle: { token: 'fake-selection-default' }, appCount: 3, categoryCount: 1 },
    ruleDays: [{ ruleId: 'walk', day: '2026-09-07', progress: 3200, met: false, metAt: null }],
    clock: { now: NOW, timezone: 'America/New_York' },
    permissions: {
      screenTime: 'granted',
      motion: 'granted',
      location: 'whenInUse',
      health: 'granted',
      camera: 'granted',
      notifications: 'granted',
    },
    session: { kind: 'anonymous', userId: 'fake-anonymous-user' },
    entitlement: { status: 'active', renewsAt: '2026-10-07T15:00:00.000Z' },
    usageMinutesToday: 42,
    history: history().slice(-14),
    steps: { today: 3200 },
    fakeSystemPrompts: 'ask',
    ...overrides,
  };
}
