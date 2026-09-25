import { Scenario, HistoryDay } from '../../../model/models';
import { Rule, RuleMode } from '../../../model/types';
import { addDays } from '../../../schedule/calendar';
export const NOW = '2026-09-07T15:00:00.000Z';
export const makeRule = (
  id = 'walk',
  mode: RuleMode = { kind: 'target', activity: 'walking', metric: 'steps', goal: 5000 },
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
      activity: { walking: 2400 + (i % 7) * 650, gym: i % 3 === 0 ? 35 : 0 },
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
    lockedApps: { handle: { token: 'fake-selection-default' }, isEmpty: false },
    ruleDays: [{ ruleId: 'walk', day: '2026-09-07', progress: 3200, met: false, metAt: null }],
    clock: { now: NOW, timezone: 'America/New_York' },
    permissions: {
      screenTime: 'granted',
      motion: 'granted',
      location: 'whenInUse',
      camera: 'granted',
      notifications: 'granted',
    },
    session: { kind: 'anonymous' },
    entitlement: { status: 'active', renewsAt: '2026-10-07T15:00:00.000Z' },
    usageMinutesToday: 42,
    history: history().slice(-14),
    steps: { today: 3200 },
    fakeSystemPrompts: 'ask',
    ...overrides,
  };
}
