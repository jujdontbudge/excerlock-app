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

test('a zone whose wall time oscillates by more than two hours is refused, not guessed', () => {
  // No real IANA zone does this. The guard exists so a bad zone database cannot silently hand the
  // app an instant hours away from the local time it asked for.
  const RealDateTimeFormat = Intl.DateTimeFormat;
  const partsFor = (ms: number) => {
    const date = new Date(ms);
    const pad = (value: number) => String(value).padStart(2, '0');
    return [
      { type: 'year', value: String(date.getUTCFullYear()) },
      { type: 'month', value: pad(date.getUTCMonth() + 1) },
      { type: 'day', value: pad(date.getUTCDate()) },
      { type: 'hour', value: pad(date.getUTCHours()) },
      { type: 'minute', value: pad(date.getUTCMinutes()) },
    ];
  };
  let call = 0;
  // First reading sits three hours behind the wall time, the next three hours ahead of it.
  Object.defineProperty(Intl, 'DateTimeFormat', {
    configurable: true,
    writable: true,
    value: function () {
      return { formatToParts: (date: Date) => partsFor(date.getTime() - (call++ === 0 ? 3 * 3_600_000 : 0)) };
    },
  });

  try {
    expect(() => localInstant('2026-09-07', 0, 'Fictional/Oscillating')).toThrow('LOCAL_INSTANT_DID_NOT_CONVERGE');
  } finally {
    Object.defineProperty(Intl, 'DateTimeFormat', { configurable: true, writable: true, value: RealDateTimeFormat });
  }
});
