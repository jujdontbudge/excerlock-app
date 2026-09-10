import { localInstant, resolveLocalInstant } from '../calendar';

test.each([
  ['America/Chicago', '2026-01-15', 720, '2026-01-15T18:00:00.000Z'],
  ['Australia/Adelaide', '2026-06-15', 720, '2026-06-15T02:30:00.000Z'],
  ['Australia/Lord_Howe', '2026-06-15', 720, '2026-06-15T01:30:00.000Z'],
])('resolves an ordinary minute in %s', (timezone, day, minute, instant) => {
  expect(resolveLocalInstant(day, minute, timezone)).toEqual({ instant, converged: true });
  expect(localInstant(day, minute, timezone)).toBe(instant);
});

test.each([
  ['America/Chicago', '2026-03-08', 150, '2026-03-08T08:30:00.000Z'],
  ['Australia/Adelaide', '2026-10-04', 150, '2026-10-03T17:00:00.000Z'],
  ['Australia/Lord_Howe', '2026-10-04', 135, '2026-10-03T15:45:00.000Z'],
])('shifts a nonexistent minute forward by the actual gap in %s', (timezone, day, minute, instant) => {
  expect(resolveLocalInstant(day, minute, timezone)).toEqual({ instant, converged: false });
});

test.each([
  ['America/Chicago', '2026-11-01', 90, '2026-11-01T06:30:00.000Z'],
  ['Australia/Adelaide', '2026-04-05', 150, '2026-04-04T16:00:00.000Z'],
  ['Australia/Lord_Howe', '2026-04-05', 105, '2026-04-04T14:45:00.000Z'],
])('chooses the first occurrence of a repeated minute in %s', (timezone, day, minute, instant) => {
  expect(resolveLocalInstant(day, minute, timezone)).toEqual({ instant, converged: true });
});

test('rejects invalid local inputs', () => {
  expect(() => resolveLocalInstant('2026-02-30', 0, 'UTC')).toThrow(RangeError);
  expect(() => resolveLocalInstant('not-a-day', 0, 'UTC')).toThrow(RangeError);
  expect(() => resolveLocalInstant('2026-01-01', -1, 'UTC')).toThrow(RangeError);
  expect(() => resolveLocalInstant('2026-01-01', 1.5, 'UTC')).toThrow(RangeError);
  expect(() => resolveLocalInstant('2026-01-01', 1440, 'UTC')).toThrow(RangeError);
  expect(() => resolveLocalInstant('2026-01-01', 0, 'Not/A_Timezone')).toThrow(RangeError);
});
