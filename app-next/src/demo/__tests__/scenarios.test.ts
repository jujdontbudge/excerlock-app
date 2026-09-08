import { scenarios } from '../scenarios';
import { validateScenario } from '../validateScenario';
test('all required scenarios are valid and the analytics fixture has six weeks of measurements', () => {
  expect(scenarios.map((s) => s.id)).toEqual([
    'fresh-install',
    'onboarding-walking-resume',
    'home-locked-walking',
    'home-unlocked-met',
    'home-walking-session',
    'home-before-window',
    'home-no-rules',
    'home-permission-needed',
    'home-no-apps',
    'gym-arrival-user',
    'gym-time-user',
    'runner-distance',
    'biker-time',
    'multi-rule-overlap',
    'window-crosses-midnight',
    'trial-active',
    'trial-expired',
    'billing-issue',
    'signed-in-apple',
    'returning-subscriber',
    'analytics-6-weeks',
    'analytics-day-zero',
    'analytics-no-measurement',
    'dynamic-type-xl',
    'reduce-motion',
    'runner-claim-on-open',
    'manual-entry-day',
    'walking-lease-renewal',
    'walking-lease-lapse',
    'treadmill-propped-credit',
    'treadmill-framing-expired',
    'gym-dwell-background',
    'gym-visit-blip',
    'window-ends-mid-walk',
    'day-rollover-mid-walk',
    'dst-spring-forward',
    'dst-fall-back',
    'saturday-rest-day',
    'clock-rewind',
    'unlock-treadmill-scan',
    'unlock-treadmill-framing',
    'unlock-treadmill-denied',
    'unlock-gym-inside',
    'unlock-gym-outside',
    'unlock-gym-lost',
    'unlock-treadmill-reduced',
    'unlock-gym-reduced',
  ]);
  for (const s of scenarios) expect(validateScenario(s)).toEqual([]);
  expect(scenarios.find((s) => s.id === 'analytics-6-weeks')!.history).toHaveLength(42);
  expect(scenarios.find((s) => s.id === 'window-crosses-midnight')!.rules[0].schedule.window).toEqual({
    kind: 'range',
    startMinute: 1200,
    endMinute: 120,
  });
  expect(validateScenario({})).not.toEqual([]);
});

test('the session-credit scenarios all use thirty-minute windows', () => {
  const ids = [
    'walking-lease-renewal',
    'walking-lease-lapse',
    'treadmill-propped-credit',
    'treadmill-framing-expired',
    'gym-dwell-background',
    'gym-visit-blip',
    'window-ends-mid-walk',
    'day-rollover-mid-walk',
    'dst-spring-forward',
    'dst-fall-back',
    'saturday-rest-day',
    'clock-rewind',
  ];
  const fixtures = ids.map((id) => scenarios.find((scenario) => scenario.id === id));
  expect(fixtures.every(Boolean)).toBe(true);
  for (const fixture of fixtures) {
    const window = fixture!.rules[0].schedule.window;
    expect(window.kind).toBe('range');
    if (window.kind === 'range') {
      expect((window.endMinute - window.startMinute + 1440) % 1440).toBe(30);
    }
  }
});
