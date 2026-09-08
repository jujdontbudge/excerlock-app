import { rule } from '../../../domain/__tests__/fixtures';
import { fromWire, MAX_BATCH, paths, readPull, toWire, WirePull } from '../wire';

/**
 * Contract suite for P2-T02: these are the exact bodies the client sends and the shape it reads back.
 * A server that disagrees breaks here first.
 */
const stamp = '2026-09-07T12:00:00.000Z';

test('the endpoint table matches P2-T02 §4', () => {
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

test('a rule travels as snake_case columns with mode and schedule verbatim', () => {
  expect(toWire.rule(rule)).toEqual({
    id: 'walk',
    activity: 'walking',
    mode: rule.mode,
    schedule: rule.schedule,
    enabled: true,
    created_at: rule.createdAt,
    updated_at: rule.updatedAt,
    deleted_at: null,
  });
  expect(fromWire.rule(toWire.rule(rule))).toEqual(rule);
});

test('a deletion is a whole row with deleted_at set and updated_at moved to the deletion instant', () => {
  expect(toWire.tombstone(rule, stamp)).toMatchObject({ id: 'walk', mode: rule.mode, updated_at: stamp, deleted_at: stamp });
});

test('a paused-for-no-gym marker never travels', () => {
  const paused = { ...rule, enabled: false, pausedReason: 'noGym' as const };
  expect(toWire.rule(paused)).not.toHaveProperty('pausedReason');
  expect(toWire.rule(paused)).not.toHaveProperty('paused_reason');
});

test('day facts round-trip, with an absent unit sent as null', () => {
  const day = { ruleId: 'walk', day: '2026-09-06', progress: 5200, met: true, metAt: stamp, updatedAt: stamp };
  expect(toWire.ruleDay(day)).toEqual({
    rule_id: 'walk',
    day: '2026-09-06',
    progress: 5200,
    met: true,
    met_at: stamp,
    unit: null,
    updated_at: stamp,
  });
  expect(fromWire.ruleDay(toWire.ruleDay(day))).toEqual(day);
  const withUnit = { ...day, unit: 'steps' as const };
  expect(fromWire.ruleDay(toWire.ruleDay(withUnit))).toEqual(withUnit);

  const usage = { day: '2026-09-06', lockedAppMinutes: 42, updatedAt: stamp };
  expect(toWire.usageDay(usage)).toEqual({ day: '2026-09-06', locked_app_minutes: 42, updated_at: stamp });
  expect(fromWire.usageDay(toWire.usageDay(usage))).toEqual(usage);

  const unlock = { ruleId: 'walk', day: '2026-09-06', ruleName: 'Walk 5,000 steps', metAt: stamp, windowEnd: stamp, updatedAt: stamp };
  expect(toWire.earnedUnlock(unlock)).toEqual({
    rule_id: 'walk',
    day: '2026-09-06',
    rule_name: 'Walk 5,000 steps',
    met_at: stamp,
    window_end: stamp,
    updated_at: stamp,
  });
  expect(fromWire.earnedUnlock(toWire.earnedUnlock(unlock))).toEqual(unlock);

  const history = {
    day: '2026-09-06',
    usageMinutes: null,
    activity: { walking: 5200, gym: 0, running: 0, biking: 0 },
    met: true,
    scheduled: true,
    sealedAt: stamp,
    updatedAt: stamp,
  };
  expect(toWire.historyDay(history)).toEqual({
    day: '2026-09-06',
    usage_minutes: null,
    activity: history.activity,
    met: true,
    scheduled: true,
    sealed_at: stamp,
    updated_at: stamp,
  });
  expect(fromWire.historyDay(toWire.historyDay(history))).toEqual(history);
});

test('the profile travels without the warm-up rating', () => {
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
  expect(toWire.profile(profile)).toEqual({
    name: 'Alex',
    referral_source: 'friend',
    age_band: '25-34',
    occupation: 'student',
    improve_first: 'exercise',
    main_reason: 'focus',
    estimated_daily_minutes: 180,
    units: 'km',
    updated_at: stamp,
  });
  const { warmupRating: _rating, ...travelled } = profile;
  expect(fromWire.profile(toWire.profile(profile))).toEqual(travelled);
});

test('a pull separates live rules from tombstones and tolerates absent collections', () => {
  const body: WirePull = {
    rules: [toWire.rule(rule), toWire.tombstone({ ...rule, id: 'gone' }, stamp)],
    rule_days: [],
    usage_days: [],
    earned_unlocks: [],
    history: [],
    profile: null,
  };
  const snapshot = fromWire.snapshot(readPull(body));
  expect(snapshot.rules).toEqual([rule]);
  expect(snapshot.tombstones).toEqual([{ id: 'gone', deletedAt: stamp }]);
  expect(snapshot.profile).toBeNull();
  expect(fromWire.snapshot(readPull({ rules: [toWire.rule(rule)] })).rules).toEqual([rule]);
  expect(fromWire.snapshot(readPull(null))).toEqual({
    rules: [],
    tombstones: [],
    ruleDays: [],
    usageDays: [],
    earnedUnlocks: [],
    history: [],
    profile: null,
  });
});
