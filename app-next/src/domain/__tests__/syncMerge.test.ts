import { emptySnapshot, SyncSnapshot } from '../../ports/SyncPort';
import { HistoryDay } from '../../ports/models';
import { LocalSyncState, mergeSnapshot, restoredAnything, rowKey } from '../syncMerge';
import { Profile, Rule, RuleDay } from '../types';
import { rule } from './fixtures';

const today = '2026-09-07';
const blankProfile: Profile = {
  warmupRating: null,
  name: '',
  referralSource: '',
  ageBand: '',
  occupation: '',
  improveFirst: 'exercise',
  mainReason: '',
  estimatedDailyMinutes: 180,
  units: 'km',
};
const filledProfile: Profile = { ...blankProfile, name: 'Alex', referralSource: 'friend', mainReason: 'focus' };
const local = (overrides: Partial<LocalSyncState> = {}): LocalSyncState => ({
  rules: [],
  tombstones: [],
  ruleDays: [],
  earnedUnlocks: [],
  history: [],
  profile: blankProfile,
  profileUpdatedAt: null,
  clocks: {},
  ...overrides,
});
const remote = (overrides: Partial<SyncSnapshot> = {}): SyncSnapshot => ({ ...emptySnapshot(), ...overrides });
const day = (overrides: Partial<RuleDay> = {}): RuleDay => ({
  ruleId: rule.id,
  day: '2026-09-05',
  progress: 1000,
  met: false,
  metAt: null,
  ...overrides,
});
const historyDay = (overrides: Partial<HistoryDay> = {}): HistoryDay => ({
  day: '2026-09-05',
  usageMinutes: null,
  activity: { walking: 0, gym: 0, running: 0, biking: 0 },
  met: false,
  scheduled: true,
  ...overrides,
});

describe('rules', () => {
  const edited: Rule = { ...rule, enabled: false, updatedAt: '2026-09-06T00:00:00Z' };

  test('a rule the device has never seen is restored', () => {
    const result = mergeSnapshot(local(), remote({ rules: [rule] }), today);
    expect(result.rules).toEqual([rule]);
    expect(result.summary).toMatchObject({ rules: 1, removedRules: 0 });
  });

  test('a newer remote edit replaces the local rule; an older one never does', () => {
    expect(mergeSnapshot(local({ rules: [rule] }), remote({ rules: [edited] }), today).rules).toEqual([edited]);
    expect(mergeSnapshot(local({ rules: [edited] }), remote({ rules: [rule] }), today).rules).toEqual([edited]);
  });

  test('an equal timestamp keeps the local rule', () => {
    const sameStamp = { ...rule, enabled: false };
    expect(mergeSnapshot(local({ rules: [rule] }), remote({ rules: [sameStamp] }), today).rules).toEqual([rule]);
  });

  test('a rule deleted on this device is not resurrected unless it was edited elsewhere after the deletion', () => {
    const tombstones = [{ id: rule.id, deletedAt: '2026-09-03T00:00:00Z' }];
    expect(mergeSnapshot(local({ tombstones }), remote({ rules: [rule] }), today).rules).toEqual([]);
    expect(mergeSnapshot(local({ tombstones }), remote({ rules: [edited] }), today).rules).toEqual([edited]);
  });

  test('a remote tombstone removes the local rule only when the deletion is newer than the local edit', () => {
    const newer = remote({ tombstones: [{ id: rule.id, deletedAt: '2026-09-04T00:00:00Z' }] });
    const older = remote({ tombstones: [{ id: rule.id, deletedAt: '2026-08-01T00:00:00Z' }] });
    expect(mergeSnapshot(local({ rules: [rule] }), newer, today)).toMatchObject({
      rules: [],
      summary: { removedRules: 1 },
    });
    expect(mergeSnapshot(local({ rules: [rule] }), older, today).rules).toEqual([rule]);
    expect(mergeSnapshot(local(), newer, today).rules).toEqual([]);
  });
});

describe('day facts', () => {
  test('a row the device does not have is taken and its clock recorded', () => {
    const row = { ...day(), updatedAt: '2026-09-05T20:00:00Z' };
    const result = mergeSnapshot(local(), remote({ ruleDays: [row] }), today);
    expect(result.ruleDays).toEqual([day()]);
    expect(result.clocks[rowKey.ruleDay(row)]).toBe('2026-09-05T20:00:00Z');
    expect(result.summary.ruleDays).toBe(1);
  });

  test("today's local row is never replaced, whatever the timestamps say", () => {
    const mine = day({ day: today, progress: 50 });
    const theirs = { ...day({ day: today, progress: 9000, met: true }), updatedAt: '2026-09-07T23:00:00Z' };
    const state = local({ ruleDays: [mine], clocks: { [rowKey.ruleDay(mine)]: '2026-09-07T01:00:00Z' } });
    expect(mergeSnapshot(state, remote({ ruleDays: [theirs] }), today).ruleDays).toEqual([mine]);
  });

  test('a local row with no recorded clock is kept', () => {
    const mine = day({ progress: 50 });
    const theirs = { ...day({ progress: 9000 }), updatedAt: '2026-09-05T23:00:00Z' };
    expect(mergeSnapshot(local({ ruleDays: [mine] }), remote({ ruleDays: [theirs] }), today).ruleDays).toEqual([mine]);
  });

  test('a local row is replaced only by a strictly newer remote row', () => {
    const mine = day({ progress: 50 });
    const clocks = { [rowKey.ruleDay(mine)]: '2026-09-05T12:00:00Z' };
    const older = { ...day({ progress: 9000 }), updatedAt: '2026-09-05T11:00:00Z' };
    const newer = { ...day({ progress: 9000 }), updatedAt: '2026-09-05T13:00:00Z' };
    expect(mergeSnapshot(local({ ruleDays: [mine], clocks }), remote({ ruleDays: [older] }), today).ruleDays).toEqual([
      mine,
    ]);
    const result = mergeSnapshot(local({ ruleDays: [mine], clocks }), remote({ ruleDays: [newer] }), today);
    expect(result.ruleDays).toEqual([day({ progress: 9000 })]);
    expect(result.clocks[rowKey.ruleDay(mine)]).toBe('2026-09-05T13:00:00Z');
  });

  test('earned unlocks merge by the same rule', () => {
    const unlock = { day: '2026-09-05', ruleId: rule.id, ruleName: 'Walk', metAt: '2026-09-05T10:00:00Z', windowEnd: '2026-09-05T21:00:00Z' };
    const result = mergeSnapshot(local(), remote({ earnedUnlocks: [{ ...unlock, updatedAt: '2026-09-05T10:00:00Z' }] }), today);
    expect(result.earnedUnlocks).toEqual([unlock]);
    expect(result.summary).toMatchObject({ earnedUnlocks: 1 });
  });

  test('sealed history never comes from the server; local rows pass through untouched', () => {
    const sealed = { ...historyDay({ met: true }), sealedAt: '2026-09-06T00:00:00Z' };
    expect(mergeSnapshot(local({ history: [sealed] }), remote(), today).history).toEqual([sealed]);
  });
});

describe('usage days', () => {
  const usage = [{ day: '2026-09-05', lockedAppMinutes: 42, updatedAt: '2026-09-06T00:00:00Z' }];

  test('fill a history day the device recorded without a measurement', () => {
    const result = mergeSnapshot(local({ history: [historyDay()] }), remote({ usageDays: usage }), today);
    expect(result.history[0].usageMinutes).toBe(42);
    expect(result.clocks[rowKey.usageDay('2026-09-05')]).toBe('2026-09-06T00:00:00Z');
    expect(result.summary.usageDays).toBe(1);
  });

  test('never overwrite a measured day and never invent a day the device does not have', () => {
    const measured = historyDay({ usageMinutes: 10 });
    expect(mergeSnapshot(local({ history: [measured] }), remote({ usageDays: usage }), today).history).toEqual([measured]);
    expect(mergeSnapshot(local({ history: [historyDay({ day: '2026-09-01' })] }), remote({ usageDays: usage }), today).history).toEqual([
      historyDay({ day: '2026-09-01' }),
    ]);
    expect(mergeSnapshot(local(), remote({ usageDays: usage }), today).history).toEqual([]);
  });
});

describe('profile', () => {
  const theirs = { ...filledProfile, name: 'Sam', updatedAt: '2026-09-06T00:00:00Z' };

  test('no remote profile keeps the local one', () => {
    expect(mergeSnapshot(local({ profile: filledProfile }), remote(), today)).toMatchObject({
      profile: filledProfile,
      summary: { profile: false },
    });
  });

  test('a blank local profile takes the remote one and keeps the local warm-up rating', () => {
    const result = mergeSnapshot(local({ profile: { ...blankProfile, warmupRating: 4 } }), remote({ profile: theirs }), today);
    expect(result.profile).toEqual({ ...filledProfile, name: 'Sam', warmupRating: 4 });
    expect(result.profileUpdatedAt).toBe('2026-09-06T00:00:00Z');
    expect(result.summary.profile).toBe(true);
  });

  test('a filled local profile with no sync clock is kept', () => {
    for (const mine of [
      { ...blankProfile, name: 'Alex' },
      { ...blankProfile, referralSource: 'friend' },
      { ...blankProfile, mainReason: 'focus' },
    ])
      expect(mergeSnapshot(local({ profile: mine }), remote({ profile: theirs }), today).profile).toEqual(mine);
  });

  test('with a sync clock the newer side wins', () => {
    const mine = local({ profile: filledProfile, profileUpdatedAt: '2026-09-05T00:00:00Z' });
    expect(mergeSnapshot(mine, remote({ profile: theirs }), today).profile.name).toBe('Sam');
    const newerHere = local({ profile: filledProfile, profileUpdatedAt: '2026-09-07T00:00:00Z' });
    expect(mergeSnapshot(newerHere, remote({ profile: theirs }), today).profile.name).toBe('Alex');
  });
});

test('restoredAnything reports whether the summary changed anything on the device', () => {
  const nothing = { rules: 0, removedRules: 0, ruleDays: 0, earnedUnlocks: 0, usageDays: 0, profile: false };
  expect(restoredAnything(nothing)).toBe(false);
  expect(restoredAnything({ ...nothing, profile: true })).toBe(true);
  expect(restoredAnything({ ...nothing, usageDays: 2 })).toBe(true);
});
