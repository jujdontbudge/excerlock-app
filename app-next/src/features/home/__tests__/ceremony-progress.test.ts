import { progressContent } from '../progressContent';
import { statusContent } from '../statusContent';
import { makeRule } from '../../../demo/scenarios/base';
import type { WalkingSession } from '../../../domain/types';

const now = '2026-09-07T15:00:00.000Z';
const permissions = {
  screenTime: 'granted',
  motion: 'granted',
  location: 'whenInUse',
  health: 'granted',
  camera: 'granted',
  notifications: 'granted',
} as const;
const apps = { handle: { token: 'selection' }, appCount: 1, categoryCount: 0 };

test('progressContent details a verifying walking session as Checking your pace', () => {
  const rule = makeRule('walk', { kind: 'state', activity: 'walking', place: 'outside' });
  const session: WalkingSession = {
    ruleId: rule.id,
    startedAt: now,
    leaseUntil: '2026-09-07T15:15:00.000Z',
    phase: 'verifying',
  };
  expect(
    progressContent(rule, { ruleId: rule.id, day: '2026-09-07', progress: 0, met: false, metAt: null }, permissions, session, now, false).detail,
  ).toBe('Checking your pace…');
});

test('statusContent keeps the locked card and explains a verifying session', () => {
  const rule = makeRule('walk', { kind: 'state', activity: 'walking', place: 'outside' });
  const session: WalkingSession = {
    ruleId: rule.id,
    startedAt: now,
    leaseUntil: '2026-09-07T15:15:00.000Z',
    phase: 'verifying',
  };
  const model = statusContent({
    decision: { state: 'locked', activeRuleIds: [rule.id], nextUnlockHint: { ruleId: rule.id, action: 'walk', remaining: null, unit: null } },
    rules: [rule],
    permissions,
    apps,
    now,
    timezone: 'America/New_York',
    walkingSession: session,
  });
  expect(model.title).toBe('Apps are blocked');
  expect(model.subtitle).toBe('Checking your pace…');
});

test("gym cards use the ceremony label and never expose the deleted check-in sheet action", () => {
  const rule = makeRule('gym', { kind: 'event', activity: 'gym', trigger: 'arrival' });
  const model = progressContent(
    rule,
    { ruleId: rule.id, day: '2026-09-07', progress: 0, met: false, metAt: null },
    permissions,
    null,
    now,
    false,
  );
  expect(model.label).toBe("I'm at the gym");
  expect(model.action).toBeUndefined();
});
