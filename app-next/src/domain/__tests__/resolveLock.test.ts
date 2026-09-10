import { resolveLock } from '../resolveLock';
import { rule } from './fixtures';
import { Rule } from '../types';
const now = '2026-09-07T19:00:00Z';
const base = { now, timezone: 'UTC', rules: [rule], ruleDays: [], walkingSession: null };
test('met morning condition opens an unmet evening condition until the earliest next-day window', () => {
  const morning: Rule = {
    ...rule,
    schedule: { days: [1, 2, 3, 4, 5], window: { kind: 'range', startMinute: 540, endMinute: 720 } },
  };
  const evening: Rule = {
    ...rule,
    id: 'evening',
    schedule: { days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'range', startMinute: 1080, endMinute: 1320 } },
  };
  expect(
    resolveLock({
      ...base,
      rules: [morning, evening],
      ruleDays: [{ ruleId: rule.id, day: '2026-09-07', progress: 5000, met: true, metAt: '2026-09-07T10:00:00Z' }],
    }),
  ).toEqual({ state: 'unlockedMet', byRuleId: rule.id, relockAt: '2026-09-08T09:00:00.000Z' });
});
test('earned relief wins over live walking and grace so watchdog cannot relock it', () => {
  const walking: Rule = { ...rule, id: 'state', mode: { kind: 'state', activity: 'walking' } };
  const met = { ruleId: 'walk', day: '2026-09-07', progress: 5000, met: true, metAt: now };
  const walkingSession = {
    ruleId: 'state',
    phase: 'walking' as const,
    startedAt: now,
    leaseUntil: '2026-09-07T19:15:00Z',
  };
  const input = { ...base, rules: [rule, walking], ruleDays: [met], walkingSession };
  expect(resolveLock(input).state).toBe('unlockedMet');
  expect(resolveLock({ ...input, walkingSession: { ...walkingSession, phase: 'grace' } }).state).toBe('unlockedMet');
  expect(resolveLock({ ...input, walkingSession: { ...walkingSession, leaseUntil: now } }).state).toBe('unlockedMet');
  expect(resolveLock({ ...input, rules: [rule, { ...walking, enabled: false }] }).state).toBe('unlockedMet');
});
test('unmet active conditions lock, before and after windows remain open', () => {
  expect(resolveLock(base)).toEqual({
    state: 'locked',
    activeRuleIds: ['walk'],
    nextUnlockHint: { ruleId: 'walk', action: 'progress', remaining: 5000, unit: 'steps' },
  });
  expect(resolveLock({ ...base, now: '2026-09-07T08:00:00Z' })).toEqual({
    state: 'beforeWindow',
    nextLockAt: '2026-09-07T09:00:00.000Z',
    ruleId: 'walk',
  });
  expect(resolveLock({ ...base, now: '2026-09-07T22:00:00Z' })).toEqual({
    state: 'afterWindow',
    nextLockAt: '2026-09-08T09:00:00.000Z',
  });
  expect(resolveLock({ ...base, rules: [] })).toEqual({ state: 'noRulesToday' });
});
test('cross-midnight met persists through the night, then expires at the next window', () => {
  const cross: Rule = {
    ...rule,
    schedule: { days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'range', startMinute: 1200, endMinute: 120 } },
  };
  const input = { ...base, now: '2026-09-07T01:00:00Z', rules: [cross] };
  expect(resolveLock(input).state).toBe('locked');
  const met = { ruleId: 'walk', day: '2026-09-06', progress: 5000, met: true, metAt: '2026-09-06T23:30:00Z' };
  expect(resolveLock({ ...input, ruleDays: [met] })).toEqual({
    state: 'unlockedMet',
    byRuleId: 'walk',
    relockAt: '2026-09-07T20:00:00.000Z',
  });
  expect(resolveLock({ ...input, ruleDays: [met], now: '2026-09-07T19:00:00Z' }).state).toBe('unlockedMet');
  expect(resolveLock({ ...input, ruleDays: [met], now: '2026-09-07T20:00:00Z' }).state).toBe('locked');
  expect(resolveLock({ ...input, ruleDays: [met], rules: [{ ...cross, enabled: false }] }).state).toBe('noRulesToday');
  expect(resolveLock({ ...base, ruleDays: [{ ...met, day: '2026-09-08' }] }).state).toBe('locked');
  expect(resolveLock({ ...base, ruleDays: [met] }).state).toBe('locked');
});
test('seeded rule sets preserve precedence and future relock invariants', () => {
  let seed = 912;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let i = 0; i < 80; i++) {
    const rules = Array.from({ length: 4 }, (_, j): Rule => ({
      ...rule,
      id: String(j),
      enabled: random() > 0.3,
      mode: j === 0 ? { kind: 'state', activity: 'walking' } : rule.mode,
    }));
    const ruleDays = rules
      .slice(1)
      .map((r) => ({ ruleId: r.id, day: '2026-09-07', progress: 5000, met: random() > 0.5, metAt: now }));
    const input = {
      ...base,
      rules,
      ruleDays,
      walkingSession: { ruleId: '0', phase: 'walking' as const, startedAt: now, leaseUntil: '2026-09-07T19:15:00Z' },
    };
    const result = resolveLock(input);
    expect(resolveLock({ ...input, rules: rules.filter((r) => r.enabled) })).toEqual(result);
    if (ruleDays.some((d) => d.met && rules.find((r) => r.id === d.ruleId)!.enabled))
      expect(result.state).toBe('unlockedMet');
    else if (rules[0].enabled) expect(result.state).toBe('unlockedWalking');
    else if (rules.some((r) => r.enabled)) expect(result.state).toBe('locked');
    else expect(result.state).toBe('noRulesToday');
    if (result.state === 'unlockedMet' && result.relockAt)
      expect(Date.parse(result.relockAt)).toBeGreaterThan(Date.parse(now));
  }
});
test('a confirmed gym presence unlocks only while a gym condition is active, and never before confirmation', () => {
  const gym: Rule = { ...rule, id: 'gym', activity: 'gym', mode: { kind: 'target', activity: 'gym', metric: 'minutes', goal: 30 } };
  const confirmed = { placeId: 'p', startedAt: '2026-09-07T18:59:00Z', confirmedAt: '2026-09-07T18:59:30Z' };
  expect(resolveLock({ ...base, rules: [gym], gymPresence: confirmed })).toEqual({
    state: 'unlockedAtGym',
    ruleId: 'gym',
    placeId: 'p',
  });
  expect(resolveLock({ ...base, rules: [gym], gymPresence: { ...confirmed, confirmedAt: null } }).state).toBe('locked');
  expect(resolveLock({ ...base, rules: [gym], gymPresence: null }).state).toBe('locked');
  expect(resolveLock({ ...base, rules: [rule], gymPresence: confirmed }).state).toBe('locked');
  expect(
    resolveLock({
      ...base,
      rules: [gym],
      gymPresence: confirmed,
      ruleDays: [{ ruleId: 'gym', day: '2026-09-07', progress: 30, met: true, metAt: now }],
    }).state,
  ).toBe('unlockedMet');
});
