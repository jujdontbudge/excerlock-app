import { shieldContent, shieldContentSet } from '../shieldContent';
import { LockWindowMonitor } from '../monitorPlan';
import { Rule, UnlockHint } from '../types';
import { rule } from './fixtures';

const progress = (remaining: number): UnlockHint => ({
  ruleId: 'walk',
  action: 'progress',
  remaining,
  goal: 5000,
  unit: 'steps',
});

test('shield copy names the fixed goal and never embeds the live remainder', () => {
  const atZero = shieldContent({ cause: 'locked', hint: progress(5000), goal: 'pending', canNotify: true });
  const later = shieldContent({ cause: 'locked', hint: progress(1800), goal: 'pending', canNotify: true });
  expect(atZero.subtitle).toBe('Walk 5,000 steps to open your apps.');
  expect(later.subtitle).toBe(atZero.subtitle);
  expect(later.subtitle).not.toContain('1,800');
  expect(
    shieldContent({
      cause: 'locked',
      hint: { ruleId: 'gym', action: 'progress', remaining: 10, goal: 30, unit: 'minutes' },
      goal: 'pending',
      canNotify: true,
    }).subtitle,
  ).toBe('Complete 30 minutes to open your apps.');
  expect(
    shieldContent({
      cause: 'locked',
      hint: { ruleId: 'unknown', action: 'progress', remaining: 1, goal: 1, unit: null },
      goal: 'pending',
      canNotify: true,
    }).subtitle,
  ).toBe('Complete an exercise condition to open your apps.');
});

test('lockWindow has its own subtitle and names the cheapest unlock', () => {
  const locked = shieldContent({ cause: 'locked', hint: progress(5000), goal: 'pending', canNotify: true });
  const window = shieldContent({ cause: 'lockWindow', hint: progress(5000), goal: 'pending', canNotify: true });
  expect(window.subtitle).toBe('Blocking has started. Walk 5,000 steps to open your apps.');
  expect(window.subtitle).not.toBe(locked.subtitle);
});

test('a met-while-closed goal uses the claim-safe variant', () => {
  expect(shieldContent({ cause: 'locked', hint: progress(0), goal: 'met', canNotify: true }).subtitle).toBe(
    'Goal complete. Open ExcerLock to open your apps.',
  );
});

test('notification denial collapses the shield to one Close button', () => {
  expect(shieldContent({ cause: 'locked', hint: progress(5000), goal: 'pending', canNotify: false })).toEqual({
    title: 'Blocked by ExcerLock',
    subtitle: 'Walk 5,000 steps to open your apps.',
    primary: 'Close',
  });
  expect(
    shieldContent({
      cause: 'locked',
      hint: { ruleId: 'state', action: 'walk', remaining: null, goal: null, unit: null },
      goal: 'pending',
      canNotify: true,
    }),
  ).toMatchObject({ primary: 'Open ExcerLock', secondary: 'Keep walking' });
});

test('shieldContentSet publishes one cheapest config per monitor name', () => {
  const gym: Rule = {
    ...rule,
    id: 'gym',
    activity: 'gym',
    mode: { kind: 'event', activity: 'gym', trigger: 'arrival' },
  };
  const monitors: LockWindowMonitor[] = [
    {
      name: 'morning',
      start: '2026-09-07T09:00:00.000Z',
      end: '2026-09-07T12:00:00.000Z',
      ruleIds: ['walk'],
      timezone: 'UTC',
      repeats: false,
    },
    {
      name: 'evening',
      start: '2026-09-07T18:00:00.000Z',
      end: '2026-09-07T21:00:00.000Z',
      ruleIds: ['walk', 'gym'],
      timezone: 'UTC',
      repeats: false,
    },
    {
      name: 'empty',
      start: '2026-09-08T09:00:00.000Z',
      end: '2026-09-08T10:00:00.000Z',
      ruleIds: ['gone'],
      timezone: 'UTC',
      repeats: false,
    },
  ];
  const set = shieldContentSet({
    monitors,
    rules: [rule, gym],
    ruleDays: [{ ruleId: 'gone', day: '2026-09-08', progress: 1, met: true, metAt: '2026-09-08T09:00:00Z' }],
    canNotify: true,
  });
  expect(Object.keys(set)).toEqual(['morning', 'evening', 'empty']);
  expect(set.morning.subtitle).toContain('Walk 5,000 steps');
  expect(set.evening.subtitle).toContain('saved gym');
  expect(set.empty.subtitle).toContain('Goal complete');
});

test('walkingEnded and missing-hint fallbacks remain explicit', () => {
  expect(shieldContent({ cause: 'walkingEnded', goal: 'pending', canNotify: true }).subtitle).toContain(
    'walk has ended',
  );
  expect(shieldContent({ cause: 'locked', goal: 'pending', canNotify: true }).subtitle).toContain(
    'Complete an exercise',
  );
});
