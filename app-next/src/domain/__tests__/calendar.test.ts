import { localInstant } from '../calendar';

test('a 09:00 window in Australia/Adelaide resolves to the requested wall-clock minute', () => {
  expect(localInstant('2026-09-07', 9 * 60, 'Australia/Adelaide')).toEqual({
    instant: '2026-09-06T23:30:00.000Z',
    converged: true,
  });
});

test("Lord Howe's thirty-minute DST gap shifts a missing wall time forward and reports the clamp", () => {
  expect(localInstant('2026-10-04', 2 * 60 + 15, 'Australia/Lord_Howe')).toEqual({
    instant: '2026-10-03T15:45:00.000Z',
    converged: false,
  });
});

test('America/New_York gaps and folds keep their established outcomes', () => {
  expect(localInstant('2026-03-08', 150, 'America/New_York')).toEqual({
    instant: '2026-03-08T07:30:00.000Z',
    converged: false,
  });
  expect(localInstant('2026-11-01', 90, 'America/New_York')).toEqual({
    instant: '2026-11-01T05:30:00.000Z',
    converged: true,
  });
});

test('a wall time after a spring-forward transition is exact, not clamped', () => {
  // 05:00 on the morning the clocks jump exists; only 02:00-03:00 does not. The first correction
  // borrows the pre-transition offset, so the search has to go one step further to land on it.
  expect(localInstant('2027-03-14', 5 * 60, 'America/New_York')).toEqual({
    instant: '2027-03-14T09:00:00.000Z',
    converged: true,
  });
});

test('a day the timezone skipped entirely never resolves to an instant', () => {
  // Samoa crossed the date line at the end of 2011: 2011-12-30 did not happen there at all, so the
  // search oscillates by a full day and refuses to invent a wall time.
  expect(() => localInstant('2011-12-30', 0, 'Pacific/Apia')).toThrow('LOCAL_INSTANT_DID_NOT_CONVERGE');
});
