import { createSystemClock, MAX_TIMER_MS } from '../systemClock';

const iso = (ms: number) => new Date(ms).toISOString();

describe('systemClock', () => {
  let now = Date.parse('2026-09-08T09:00:00.000Z');
  const clock = () => createSystemClock({ now: () => now, timezone: () => 'America/New_York' });

  beforeEach(() => {
    now = Date.parse('2026-09-08T09:00:00.000Z');
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports the device instant and zone', () => {
    const system = clock();
    expect(system.now()).toBe(iso(now));
    expect(system.timezone()).toBe('America/New_York');
    system.dispose();
  });

  it('credits only time past the furthest instant it has seen', () => {
    const system = clock();
    expect(system.monotonicMs()).toBe(0);
    now += 5_000;
    expect(system.monotonicMs()).toBe(5_000);
    // Setting the clock back and forward again must not credit the whole forward jump: that is
    // how a user would shorten a ceremony that measures its own duration.
    now -= 60_000;
    expect(system.monotonicMs()).toBe(5_000);
    now += 61_000;
    expect(system.monotonicMs()).toBe(6_000);
    system.dispose();
  });

  it('runs a deadline that has already passed straight away', () => {
    const system = clock();
    const fired = jest.fn();
    system.at(iso(now - 1), fired);
    expect(fired).toHaveBeenCalledTimes(1);
    system.dispose();
  });

  it('runs a deadline when its instant arrives', () => {
    const system = clock();
    const fired = jest.fn();
    system.at(iso(now + 30_000), fired);
    now += 30_000;
    jest.advanceTimersByTime(30_000);
    expect(fired).toHaveBeenCalledTimes(1);
    system.dispose();
  });

  it('re-arms a deadline further out than one timer can hold', () => {
    const system = clock();
    const fired = jest.fn();
    system.at(iso(now + MAX_TIMER_MS * 2), fired);
    now += MAX_TIMER_MS;
    jest.advanceTimersByTime(MAX_TIMER_MS);
    expect(fired).not.toHaveBeenCalled();
    now += MAX_TIMER_MS;
    jest.advanceTimersByTime(MAX_TIMER_MS);
    expect(fired).toHaveBeenCalledTimes(1);
    system.dispose();
  });

  it('waits again when the deadline is still ahead because the clock moved back', () => {
    const system = clock();
    const fired = jest.fn();
    system.at(iso(now + 10_000), fired);
    now -= 10_000;
    jest.advanceTimersByTime(10_000);
    expect(fired).not.toHaveBeenCalled();
    now += 30_000;
    jest.advanceTimersByTime(30_000);
    expect(fired).toHaveBeenCalledTimes(1);
    system.dispose();
  });

  it('cancels a deadline that is no longer wanted', () => {
    const system = clock();
    const fired = jest.fn();
    system.at(iso(now + 1_000), fired)();
    now += 1_000;
    jest.advanceTimersByTime(1_000);
    expect(fired).not.toHaveBeenCalled();
    system.dispose();
  });

  it('rejects an instant it cannot parse', () => {
    const system = clock();
    expect(() => system.at('not-a-time', jest.fn())).toThrow('INVALID_CLOCK_DEADLINE');
    system.dispose();
  });

  it('ticks once a second only while something is watching', () => {
    const system = clock();
    const seen = jest.fn();
    const stop = system.subscribe(seen);
    jest.advanceTimersByTime(3_000);
    expect(seen).toHaveBeenCalledTimes(3);
    stop();
    jest.advanceTimersByTime(5_000);
    expect(seen).toHaveBeenCalledTimes(3);
    system.dispose();
  });

  it('stops every timer when disposed', () => {
    const system = clock();
    const seen = jest.fn();
    const fired = jest.fn();
    system.subscribe(seen);
    system.at(iso(now + 1_000), fired);
    system.dispose();
    now += 10_000;
    jest.advanceTimersByTime(10_000);
    expect(seen).not.toHaveBeenCalled();
    expect(fired).not.toHaveBeenCalled();
  });
});
