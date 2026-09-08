import { rule } from '../../../domain/__tests__/fixtures';
import { fromWire, MAX_BATCH, paths, readPull, toWire, WirePull } from '../wire';

/**
 * Contract suite against `server/src/sync/payload.ts` (P2-T02): these are the exact bodies the client
 * sends and the shape it reads back. Every server object is `.strict()`, so an extra key here is a
 * rejected batch there; the "never travels" tests are load-bearing.
 */
const stamp = '2026-09-07T12:00:00.000Z';
const defaults = { estimatedDailyMinutes: 180, units: 'km' as const };

test('the endpoint table matches the server routes', () => {
  expect(paths).toEqual({
    rules: '/v1/sync/rules',
    ruleDays: '/v1/sync/rule-days',
    usageDays: '/v1/sync/usage-days',
    earnedUnlocks: '/v1/sync/earned-unlocks',
    history: '/v1/sync/history',
    profile: '/v1/sync/profile',
    pull: '/v1/sync',
  });
  expect(MAX_BATCH).toBe(400);
});

test('a rule travels as the server rulePayload with mode and schedule verbatim', () => {
  expect(toWire.rule(rule)).toEqual({
    id: 'walk',
    activity: 'walking',
    mode: rule.mode,
    schedule: rule.schedule,
    enabled: true,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
    deletedAt: null,
  });
  expect(fromWire.rule(toWire.rule(rule))).toEqual(rule);
});

test('a deletion is a whole row with deletedAt set and updatedAt moved to the deletion instant', () => {
  expect(toWire.tombstone(rule, stamp)).toMatchObject({ id: 'walk', mode: rule.mode, updatedAt: stamp, deletedAt: stamp });
});

test('device-only fields never travel: pausedReason and the warm-up rating', () => {
  const paused = { ...rule, enabled: false, pausedReason: 'noGym' as const };
  expect(Object.keys(toWire.rule(paused)).sort()).toEqual(
    ['activity', 'createdAt', 'deletedAt', 'enabled', 'id', 'mode', 'schedule', 'updatedAt'].sort(),
  );
  const profile = {
    warmupRating: 5,
    name: 'Alex',
    referralSource: 'friend',
    ageBand: '25-34',
    occupation: 'student',
    improveFirst: 'exercise' as const,
    mainReason: 'focus',
    estimatedDailyMinutes: 180,
    units: 'km' as const,
    updatedAt: stamp,
  };
  expect(toWire.profile(profile)).not.toHaveProperty('warmupRating');
});

test('day facts round-trip, with an absent rule-day unit sent as null', () => {
  const day = { ruleId: 'walk', day: '2026-09-06', progress: 5200, met: true, metAt: stamp, updatedAt: stamp };
  expect(toWire.ruleDay(day)).toEqual({ ...day, unit: null });
  expect(fromWire.ruleDay(toWire.ruleDay(day))).toEqual(day);
  const withUnit = { ...day, unit: 'steps' as const };
  expect(toWire.ruleDay(withUnit)).toEqual(withUnit);
  expect(fromWire.ruleDay(toWire.ruleDay(withUnit))).toEqual(withUnit);
  expect(fromWire.ruleDay({ ruleId: 'walk', day: '2026-09-06', progress: 0, met: false, updatedAt: stamp })).toMatchObject({ metAt: null });

  const history = {
    day: '2026-09-06',
    usageMinutes: null,
    activity: { walking: 5200, gym: 0, running: 0, biking: 0 },
    met: true,
    scheduled: true,
    sealedAt: stamp,
    updatedAt: stamp,
  };
  expect(toWire.historyDay(history)).toEqual(history);
  expect(fromWire.historyDay(toWire.historyDay(history))).toEqual(history);

  const usage = { day: '2026-09-06', lockedAppMinutes: 42, updatedAt: stamp };
  expect(fromWire.usageDay(toWire.usageDay(usage))).toEqual(usage);

  const unlock = { day: '2026-09-06', ruleId: 'walk', ruleName: 'Walk 5,000 steps', metAt: stamp, windowEnd: stamp, updatedAt: stamp };
  expect(toWire.earnedUnlock(unlock)).toEqual(unlock);
  expect(fromWire.earnedUnlock(toWire.earnedUnlock(unlock))).toEqual(unlock);
});

test('the profile travels as the server profilePayload and null columns read back as blanks', () => {
  const profile = {
    name: 'Alex',
    referralSource: 'friend',
    ageBand: '25-34',
    occupation: 'student',
    improveFirst: 'exercise' as const,
    mainReason: 'focus',
    estimatedDailyMinutes: 180,
    units: 'km' as const,
    updatedAt: stamp,
  };
  expect(toWire.profile(profile)).toEqual(profile);
  expect(fromWire.profile(toWire.profile(profile), defaults)).toEqual(profile);
  expect(fromWire.profile({ updatedAt: stamp, name: null, units: null }, { estimatedDailyMinutes: 120, units: 'mi' })).toEqual({
    name: '',
    referralSource: '',
    ageBand: '',
    occupation: '',
    improveFirst: 'exercise',
    mainReason: '',
    estimatedDailyMinutes: 120,
    units: 'mi',
    updatedAt: stamp,
  });
});

test('a pull separates live rules from tombstones and tolerates absent collections', () => {
  const body: WirePull = {
    rules: [toWire.rule(rule), toWire.tombstone({ ...rule, id: 'gone' }, stamp)],
    ruleDays: [],
    usageDays: [],
    earnedUnlocks: [],
    historyDays: [],
    profile: null,
  };
  const snapshot = fromWire.snapshot(readPull(body), defaults);
  expect(snapshot.rules).toEqual([rule]);
  expect(snapshot.tombstones).toEqual([{ id: 'gone', deletedAt: stamp }]);
  expect(snapshot.profile).toBeNull();
  expect(fromWire.snapshot(readPull({ rules: [{ ...toWire.rule(rule), deletedAt: undefined }] }), defaults).rules).toEqual([rule]);
  expect(fromWire.snapshot(readPull(null), defaults)).toEqual({
    rules: [],
    tombstones: [],
    ruleDays: [],
    usageDays: [],
    earnedUnlocks: [],
    history: [],
    profile: null,
  });
});
