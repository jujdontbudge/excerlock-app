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
