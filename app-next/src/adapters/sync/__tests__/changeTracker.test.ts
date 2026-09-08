import { rule } from '../../../domain/__tests__/fixtures';
import { rowKey } from '../../../domain/syncMerge';
import { Profile, RuleDay } from '../../../domain/types';
import { HistoryDay } from '../../../ports/models';
import { DeviceFacts, hasDayFacts, markAllDirty, pruneTombstones, trackChanges, usageDaysOf } from '../changeTracker';
import { initialSyncState } from '../syncStore';

const profile: Profile = {
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
const facts = (overrides: Partial<DeviceFacts> = {}): DeviceFacts => ({
  rules: [],
  ruleDays: [],
  earnedUnlocks: [],
  history: [],
  profile,
  ...overrides,
});
const day = (overrides: Partial<RuleDay> = {}): RuleDay => ({ ruleId: rule.id, day: '2026-09-06', progress: 10, met: false, metAt: null, ...overrides });
const historyDay = (overrides: Partial<HistoryDay> & { sealedAt?: string } = {}): HistoryDay => ({
  day: '2026-09-06',
  usageMinutes: null,
  activity: { walking: 0, gym: 0, running: 0, biking: 0 },
  met: false,
  scheduled: true,
  ...overrides,
});
const t1 = '2026-09-07T10:00:00.000Z';

test('an unchanged observation leaves the outbox alone', () => {
  const before = initialSyncState();
  expect(trackChanges(before, facts({ rules: [rule] }), facts({ rules: [rule] }), t1)).toBe(before);
});

test('a rule edit marks the rule set dirty; a removal records a deletion and a tombstone', () => {
  const edited = trackChanges(initialSyncState(), facts(), facts({ rules: [rule] }), t1);
  expect(edited).toMatchObject({ rulesDirty: true, rulesChangedAt: t1, deleted: [], tombstones: [] });
  const removed = trackChanges(edited, facts({ rules: [rule] }), facts(), t1);
  expect(removed.deleted).toEqual([{ rule, deletedAt: t1 }]);
  expect(removed.tombstones).toEqual([{ id: rule.id, deletedAt: t1 }]);
  const recreated = trackChanges(removed, facts(), facts({ rules: [rule] }), t1);
  expect(recreated.deleted).toEqual([]);
  expect(recreated.tombstones).toEqual([]);
});

test('a changed day fact is queued once per key with the observation instant as its clock', () => {
  const first = trackChanges(initialSyncState(), facts(), facts({ ruleDays: [day()] }), t1);
  const key = rowKey.ruleDay(day());
  expect(first.ruleDays[key]).toEqual({ ...day(), updatedAt: t1 });
  expect(first.clocks[key]).toBe(t1);
  const t2 = '2026-09-07T10:05:00.000Z';
  const second = trackChanges(first, facts({ ruleDays: [day()] }), facts({ ruleDays: [day({ progress: 20 })] }), t2);
  expect(Object.keys(second.ruleDays)).toEqual([key]);
  expect(second.ruleDays[key]).toEqual({ ...day({ progress: 20 }), updatedAt: t2 });
  expect(hasDayFacts(second)).toBe(true);
  expect(hasDayFacts(initialSyncState())).toBe(false);
});

test('only sealed history rows and measured usage days are queued', () => {
  const unsealed = historyDay();
  const sealed = historyDay({ day: '2026-09-05', sealedAt: t1, usageMinutes: 40 });
  const state = trackChanges(initialSyncState(), facts(), facts({ history: [unsealed, sealed] }), t1);
  expect(Object.keys(state.history)).toEqual([rowKey.history(sealed)]);
  expect(Object.values(state.usageDays)).toEqual([{ day: '2026-09-05', lockedAppMinutes: 40, updatedAt: t1 }]);
  expect(usageDaysOf([historyDay({ usageMinutes: 12 }), unsealed])).toEqual([{ day: '2026-09-06', lockedAppMinutes: 12 }]);
});

test('a profile edit marks the profile dirty with its change instant', () => {
  const state = trackChanges(initialSyncState(), facts(), facts({ profile: { ...profile, name: 'Alex' } }), t1);
  expect(state).toMatchObject({ profileDirty: true, profileUpdatedAt: t1 });
});

test('markAllDirty queues everything at its known clock, falling back to now', () => {
  const known = { ...initialSyncState(), clocks: { [rowKey.ruleDay(day())]: '2026-09-06T00:00:00.000Z' } };
  const state = markAllDirty(known, facts({ rules: [rule], ruleDays: [day(), day({ day: '2026-09-04' })] }), t1);
  expect(state).toMatchObject({ rulesDirty: true, profileDirty: true, rulesChangedAt: t1, profileUpdatedAt: t1 });
  expect(state.ruleDays[rowKey.ruleDay(day())].updatedAt).toBe('2026-09-06T00:00:00.000Z');
  expect(state.ruleDays[rowKey.ruleDay(day({ day: '2026-09-04' }))].updatedAt).toBe(t1);
});

test('tombstones older than ninety days are pruned', () => {
  const state = {
    ...initialSyncState(),
    tombstones: [
      { id: 'old', deletedAt: '2026-05-01T00:00:00.000Z' },
      { id: 'recent', deletedAt: '2026-09-01T00:00:00.000Z' },
    ],
  };
  expect(pruneTombstones(state, '2026-09-07').tombstones.map((entry) => entry.id)).toEqual(['recent']);
  const kept = { ...state, tombstones: state.tombstones.slice(1) };
  expect(pruneTombstones(kept, '2026-09-07')).toBe(kept);
});
