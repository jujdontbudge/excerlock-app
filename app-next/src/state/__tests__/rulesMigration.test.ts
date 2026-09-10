import AsyncStorage from '@react-native-async-storage/async-storage';
import { rulesRetirementNote, rulesStore } from '../rulesStore';
import { ruleDaysStore } from '../ruleDaysStore';
import { rule as walkingRule } from '../../domain/__tests__/fixtures';

const RULES_KEY = 'excerlock-next.rules.v1';
const RULE_DAYS_KEY = 'excerlock-next.ruleDays.v1';
const gymRule = {
  id: 'gym',
  activity: 'gym',
  mode: { kind: 'target', activity: 'gym', metric: 'minutes', goal: 30 },
  schedule: { days: [1, 2, 3, 4, 5], window: { kind: 'allDay' } },
  enabled: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};
// Legacy rows as raw persisted JSON: the narrowed RuleMode union can no longer spell these,
// which is exactly what a device stored before the update still holds.
const legacyRows = JSON.parse(
  `[
    {"id":"run","activity":"running","mode":{"kind":"target","activity":"running","metric":"minutes","goal":20},
     "schedule":{"days":[1,2,3],"window":{"kind":"allDay"}},"enabled":true,
     "createdAt":"2026-09-01T00:00:00Z","updatedAt":"2026-09-01T00:00:00Z"},
    {"id":"bike","activity":"biking","mode":{"kind":"target","activity":"biking","metric":"distance","goal":5,"unit":"mi"},
     "schedule":{"days":[1,2,3],"window":{"kind":"allDay"}},"enabled":true,
     "createdAt":"2026-09-01T00:00:00Z","updatedAt":"2026-09-01T00:00:00Z"},
    {"id":"broken","activity":"walking"}
  ]`,
) as unknown[];
const lockedApps = { handle: null, appCount: 0, categoryCount: 0 };

beforeEach(async () => {
  await AsyncStorage.removeItem(RULES_KEY);
  await AsyncStorage.removeItem(RULE_DAYS_KEY);
  rulesStore.getState().reset();
  ruleDaysStore.getState().reset();
});

test('a mixed persisted store keeps walking/gym rules, drops run/bike/malformed rows, and sets a one-line note', async () => {
  await AsyncStorage.setItem(
    RULES_KEY,
    JSON.stringify({ state: { data: { rules: [walkingRule, gymRule, ...legacyRows], lockedApps } }, version: 0 }),
  );
  await rulesStore.persist.rehydrate();
  expect(rulesStore.getState().data.rules.map((r) => r.id)).toEqual(['walk', 'gym']);
  expect(rulesStore.getState().data.migrationNote).toBe(rulesRetirementNote);
  expect(rulesStore.getState().data.migrationNote).not.toContain('\n');
});

test('the retirement note is consumable: once dismissed it never returns', async () => {
  await AsyncStorage.setItem(
    RULES_KEY,
    JSON.stringify({ state: { data: { rules: [walkingRule, ...legacyRows], lockedApps } }, version: 0 }),
  );
  await rulesStore.persist.rehydrate();
  expect(rulesStore.getState().data.migrationNote).toBe(rulesRetirementNote);
  rulesStore.getState().patch({ migrationNote: null });
  expect(rulesStore.getState().data.migrationNote).toBeNull();
  await new Promise((resolve) => setImmediate(resolve));
  await rulesStore.persist.rehydrate();
  expect(rulesStore.getState().data.rules.map((r) => r.id)).toEqual(['walk']);
  expect(rulesStore.getState().data.migrationNote).toBeNull();
});

test('rule-day hydration drops only the malformed row and keeps valid progress', async () => {
  const day = { ruleId: 'walk', day: '2026-09-07', progress: 3200, met: false, metAt: null };
  await AsyncStorage.setItem(
    RULE_DAYS_KEY,
    JSON.stringify({
      state: { data: { days: [day, { ruleId: 'walk' }], walkingSession: null, gymPresence: null } },
      version: 0,
    }),
  );
  await ruleDaysStore.persist.rehydrate();
  expect(ruleDaysStore.getState().data.days).toEqual([day]);
});
