import { collectEarnedUnlocks, earnedUnlockForProgress, upsertEarnedUnlock } from '../earnedUnlock';
import { pruneEarnedUnlocks } from '../sealDay';
import { applyProgress } from '../progress';
import { windowInstances } from '../schedule';
import { EarnedUnlock, RuleDay } from '../types';
import { rule } from './fixtures';

const before: RuleDay = { ruleId: 'walk', day: '2026-09-07', progress: 0, met: false, metAt: null };
const instance = windowInstances(rule, before.day, 'UTC')[0];

test('the instant applyProgress flips a row to met creates one immutable earned unlock', () => {
  const after = applyProgress(rule, before, 5000, '2026-09-07T10:00:00.000Z');
  const unlock = earnedUnlockForProgress(rule, before, after, instance);
  expect(unlock).toEqual({
    day: '2026-09-07',
    ruleId: 'walk',
    ruleName: 'Walk 5,000 steps',
    metAt: '2026-09-07T10:00:00.000Z',
    windowEnd: '2026-09-07T21:00:00.000Z',
  });
  expect(
    earnedUnlockForProgress(rule, after, applyProgress(rule, after, 6000, '2026-09-07T11:00:00Z'), instance),
  ).toBeNull();
  expect(upsertEarnedUnlock([unlock!], { ...unlock!, ruleName: 'Changed' })).toEqual([unlock]);
  expect(upsertEarnedUnlock([unlock!], { ...unlock!, day: '2026-09-08' })).toHaveLength(2);
  expect(upsertEarnedUnlock([unlock!], { ...unlock!, ruleId: 'other' })).toHaveLength(2);
  expect(
    collectEarnedUnlocks(
      [unlock!],
      [
        { rule, before, after, instance },
        { rule, before: after, after: applyProgress(rule, after, 6000, '2026-09-07T11:00:00Z'), instance },
      ],
    ),
  ).toEqual([unlock]);
});

test('earned unlock history retains today and yesterday at rollover', () => {
  const records: EarnedUnlock[] = [
    {
      day: '2026-09-05',
      ruleId: 'old',
      ruleName: 'Old',
      metAt: '2026-09-05T10:00:00Z',
      windowEnd: '2026-09-05T21:00:00Z',
    },
    {
      day: '2026-09-06',
      ruleId: 'yesterday',
      ruleName: 'Yesterday',
      metAt: '2026-09-06T10:00:00Z',
      windowEnd: '2026-09-06T21:00:00Z',
    },
    {
      day: '2026-09-07',
      ruleId: 'today',
      ruleName: 'Today',
      metAt: '2026-09-07T10:00:00Z',
      windowEnd: '2026-09-07T21:00:00Z',
    },
  ];
  expect(pruneEarnedUnlocks(records, '2026-09-07').map((record) => record.ruleId)).toEqual(['yesterday', 'today']);
});
