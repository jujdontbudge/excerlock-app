import { reviewFacts, reviewPromptDecision } from '../reviewPrompt';
import { HistoryDay } from '../../ports/models';

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

const day = (day: string, met = true, scheduled = true): HistoryDay => ({
  day,
  usageMinutes: null,
  activity: { walking: met ? 5000 : 100, gym: 0, running: 0, biking: 0 },
  met,
  scheduled,
  sealedAt: `${day}T23:59:59.000Z`,
});

test('reviewFacts counts met days and the current streak over scheduled days', () => {
  const facts = reviewFacts(
    [
      day('2026-09-05'),
      day('2026-09-06', false),
      day('2026-09-08'),
      day('2026-09-09'),
      day('2026-09-10'),
      day('2026-09-11'),
    ],
    '2026-09-10',
  );

  expect(facts).toEqual({ metDays: 4, currentStreak: 3 });
});

test('a day nothing was scheduled does not break the streak, and an empty history prompts nothing', () => {
  expect(reviewFacts([day('2026-09-09'), day('2026-09-10', false, false)], '2026-09-10')).toEqual({
    metDays: 1,
    currentStreak: 1,
  });
  expect(reviewFacts([], '2026-09-10')).toEqual({ metDays: 0, currentStreak: 0 });
});
