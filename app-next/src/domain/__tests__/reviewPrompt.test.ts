import { reviewFacts, reviewPromptDecision } from '../reviewPrompt';
import { Rule, RuleDay } from '../types';

const now = '2026-09-10T12:00:00.000Z';
const fresh = { installedAt: '2026-09-01T00:00:00.000Z', promptCount: 0, manualRateTapped: false };

test('the first prompt needs five met days and a three-day-old install', () => {
  expect(reviewPromptDecision(fresh, { metDays: 5, currentStreak: 0 }, now)).toEqual({ show: true, stage: 'metDays' });
  expect(reviewPromptDecision(fresh, { metDays: 4, currentStreak: 40 }, now)).toEqual({ show: false });
  expect(
    reviewPromptDecision({ ...fresh, installedAt: '2026-09-09T00:00:00.000Z' }, { metDays: 9, currentStreak: 9 }, now),
  ).toEqual({
    show: false,
  });
});

test('the second prompt waits for a 7-day streak and the third for 30', () => {
  expect(reviewPromptDecision({ ...fresh, promptCount: 1 }, { metDays: 20, currentStreak: 6 }, now)).toEqual({
    show: false,
  });
  expect(reviewPromptDecision({ ...fresh, promptCount: 1 }, { metDays: 20, currentStreak: 7 }, now)).toEqual({
    show: true,
    stage: 'streak7',
  });
  expect(reviewPromptDecision({ ...fresh, promptCount: 2 }, { metDays: 20, currentStreak: 29 }, now)).toEqual({
    show: false,
  });
  expect(reviewPromptDecision({ ...fresh, promptCount: 2 }, { metDays: 20, currentStreak: 30 }, now)).toEqual({
    show: true,
    stage: 'streak30',
  });
});

test('three prompts, a manual Rate tap or an unknown install date stop the policy', () => {
  const facts = { metDays: 99, currentStreak: 99 };
  expect(reviewPromptDecision({ ...fresh, promptCount: 3 }, facts, now)).toEqual({ show: false });
  expect(reviewPromptDecision({ ...fresh, manualRateTapped: true }, facts, now)).toEqual({ show: false });
  expect(reviewPromptDecision({ ...fresh, installedAt: null }, facts, now)).toEqual({ show: false });
});

const rule: Rule = {
  id: 'r1',
  activity: 'walking',
  mode: { kind: 'target', activity: 'walking', metric: 'steps', goal: 1000, place: 'either' },
  schedule: { days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'allDay' } },
  enabled: true,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};
const row = (day: string, met = true): RuleDay => ({
  ruleId: 'r1',
  day,
  progress: met ? 1000 : 10,
  met,
  metAt: met ? `${day}T10:00:00.000Z` : null,
});

test('reviewFacts counts distinct met days and the current streak over scheduled days', () => {
  const facts = reviewFacts(
    [rule],
    [
      row('2026-09-08'),
      row('2026-09-09'),
      row('2026-09-10'),
      row('2026-09-10'),
      row('2026-09-05'),
      row('2026-09-11'),
      row('2026-09-06', false),
    ],
    '2026-09-10',
    'America/New_York',
  );
  expect(facts).toEqual({ metDays: 4, currentStreak: 3 });
});

test('a paused rule schedules nothing, so an unmet day does not break the streak but a met one still counts', () => {
  expect(
    reviewFacts(
      [{ ...rule, enabled: false }],
      [row('2026-09-09'), row('2026-09-10')],
      '2026-09-10',
      'America/New_York',
    ),
  ).toEqual({
    metDays: 2,
    currentStreak: 0,
  });
  expect(reviewFacts([], [], '2026-09-10', 'America/New_York')).toEqual({ metDays: 0, currentStreak: 0 });
});
