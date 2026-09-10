import { resolveLock, inactiveWalking, unknownPlacement } from '../resolveLock';
import type { Rule, RuleDay } from '../types';
const now = '2026-09-07T19:00:00.000Z';
const schedule = { days: [1] as [1], window: { kind: 'range' as const, startMinute: 780, endMinute: 900 } };
const walkState: Rule = { id: 'walk-state', activity: 'walking', mode: { kind: 'state', activity: 'walking' }, schedule, enabled: true, createdAt: now, updatedAt: now };
const walkTarget: Rule = { ...walkState, id: 'walk-target', mode: { kind: 'target', activity: 'walking', metric: 'minutes', goal: 20 } };
const gym: Rule = { ...walkState, id: 'gym', activity: 'gym', mode: { kind: 'event', activity: 'gym', trigger: 'arrival' } };
const base = { now, timezone: 'America/Chicago', rules: [walkState], ruleDays: [] as RuleDay[], detection: inactiveWalking, placement: unknownPlacement, gymPresence: null };
test('earned target relief has priority over every live signal and survives gym exit', () => {
  const met: RuleDay = { ruleId: walkTarget.id, day: '2026-09-07', progress: 20, met: true, metAt: '2026-09-07T18:59:00Z' };
  const result = resolveLock({ ...base, rules: [walkTarget, walkState], ruleDays: [met], detection: { state: 'active', since: now }, placement: { state: 'propped', liveRelief: true, since: now } });
  expect(result).toEqual(expect.objectContaining({ state: 'unlockedMet', byRuleId: walkTarget.id, metAt: met.metAt }));
});
test('target walking never grants live relief before its goal', () => {
  expect(resolveLock({ ...base, rules: [walkTarget], detection: { state: 'active', since: now } }).state).toBe('locked');
});
test('active STATE walking and verified propped evidence grant distinct live relief', () => {
  expect(resolveLock({ ...base, detection: { state: 'active', since: now } })).toEqual({ state: 'unlockedWalking', ruleId: walkState.id, since: now });
  expect(resolveLock({ ...base, placement: { state: 'propped', liveRelief: true, since: now } })).toEqual({ state: 'unlockedPropped', ruleId: walkState.id, since: now });
  expect(resolveLock({ ...base, placement: { state: 'handheld', liveRelief: true, since: now } }).state).toBe('unlockedPropped');
  expect(resolveLock({ ...base, placement: { state: 'propped', liveRelief: false, since: now } }).state).toBe('locked');
});
test('gym relief needs confirmed presence and exits immediately', () => {
  const presence = { placeId: 'place', startedAt: '2026-09-07T18:58:00Z', confirmedAt: '2026-09-07T18:58:30Z' };
  expect(resolveLock({ ...base, rules: [gym], gymPresence: presence })).toEqual({ state: 'unlockedAtGym', ruleId: gym.id, placeId: 'place', since: presence.confirmedAt });
  expect(resolveLock({ ...base, rules: [gym], gymPresence: null }).state).toBe('locked');
});
test('walking evidence never bypasses inactive or disabled STATE windows', () => {
  const detection = { state: 'active' as const, since: now };
  expect(resolveLock({ ...base, rules: [{ ...walkState, enabled: false }], detection }).state).toBe('noRulesToday');
  expect(resolveLock({ ...base, now: '2026-09-07T12:00:00Z', detection }).state).not.toBe('unlockedWalking');
});
