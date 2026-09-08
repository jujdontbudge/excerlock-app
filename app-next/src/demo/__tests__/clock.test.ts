import { FakeClock } from '../clock';
test('clock ticks while observed, adjusts deterministically, and releases its timer', () => {
  jest.useFakeTimers();
  const clock = new FakeClock('2026-09-07T12:00:00Z', 'America/New_York'),
    listener = jest.fn();
  const stop = clock.subscribe(listener);
  jest.advanceTimersByTime(2000);
  expect(clock.now()).toBe('2026-09-07T12:00:02.000Z');
  clock.advance(3600000);
  expect(clock.now()).toBe('2026-09-07T13:00:02.000Z');
  clock.set('2026-09-08T00:00:00Z', 'Asia/Tokyo');
  expect(clock.timezone()).toBe('Asia/Tokyo');
  stop();
  expect(jest.getTimerCount()).toBe(0);
  jest.useRealTimers();
});

test('deadline callbacks fire together on a dev-clock jump and monotonic time never rewinds', () => {
  const clock = new FakeClock('2026-09-07T12:00:00.000Z', 'UTC');
  const gym = jest.fn();
  const lease = jest.fn();
  const grace = jest.fn();
  clock.at('2026-09-07T12:00:30.000Z', gym);
  clock.at('2026-09-07T12:15:00.000Z', lease);
  clock.at('2026-09-07T12:00:45.000Z', grace);

  clock.advance(15 * 60_000);

  expect([gym.mock.calls.length, lease.mock.calls.length, grace.mock.calls.length]).toEqual([1, 1, 1]);
  expect(clock.monotonicMs()).toBe(15 * 60_000);
  clock.set('2026-09-07T11:00:00.000Z');
  expect(clock.monotonicMs()).toBe(15 * 60_000);
  clock.advance(60_000);
  expect(clock.monotonicMs()).toBe(16 * 60_000);
  expect([gym.mock.calls.length, lease.mock.calls.length, grace.mock.calls.length]).toEqual([1, 1, 1]);
  clock.dispose();
});
