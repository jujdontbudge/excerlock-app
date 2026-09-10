import { validateRule } from '../domain/validateRule';
import * as v from '../state/validation';
export function validateScenario(value: unknown): string[] {
  if (!v.object(value)) return ['scenario'];
  const checks = {
    id: v.text,
    title: v.text,
    onboarding: (x: unknown) =>
      typeof x === 'string' && (x === 'fresh' || x === 'complete' || x.startsWith('resumeAt:')),
    rules: v.array((r) => validateRule(r).length === 0),
    lockedApps: v.lockedApps,
    ruleDays: v.array(v.ruleDay),
    clock: v.shape({ now: v.iso, timezone: v.text }),
    permissions: v.shape({
      screenTime: v.permission,
      motion: v.permission,
      camera: v.permission,
      notifications: v.permission,
      location: v.oneOf(['notDetermined', 'whenInUse', 'always', 'denied']),
    }),
    session: (x: unknown) => v.session(x) || v.signedIn(x),
    entitlement: v.shape({
      status: v.oneOf(['unknown', 'none', 'trial', 'active', 'expired', 'billingIssue']),
      renewsAt: v.nullable(v.iso),
    }),
    usageMinutesToday: v.nullable(v.number()),
    history: v.array(
      v.shape({
        day: v.text,
        usageMinutes: v.nullable(v.number()),
        activity: v.shape({ walking: v.number(), gym: v.number() }),
        met: v.bool,
        scheduled: v.bool,
      }),
    ),
    steps: v.shape({ today: v.number() }),
    fakeSystemPrompts: v.oneOf(['grant', 'deny', 'ask']),
  };
  return Object.entries(checks)
    .filter(([key, check]) => !check(value[key]))
    .map(([key]) => key);
}
