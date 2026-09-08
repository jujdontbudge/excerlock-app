import {
  extendWalkIncrement,
  isWalkWindowActive,
  planWalkIncrement,
  WALK_INCREMENT_MINUTES,
  WALK_INCREMENT_MS,
} from '../lease';

const MIN_MS = 60_000;

it('fixes the increment at fifteen minutes, never user-set', () => {
  expect(WALK_INCREMENT_MINUTES).toBe(15);
  expect(WALK_INCREMENT_MS).toBe(15 * MIN_MS);
});

it('opens exactly one increment from the explicit start', () => {
  expect(planWalkIncrement(1_000_000)).toEqual({
    startMs: 1_000_000,
    endMs: 1_000_000 + WALK_INCREMENT_MS,
  });
});

it('renews to one increment from the re-verify moment, keeping the start', () => {
  expect(extendWalkIncrement(planWalkIncrement(0), 5 * MIN_MS)).toEqual({
    startMs: 0,
    endMs: 5 * MIN_MS + WALK_INCREMENT_MS,
  });
});

it('never grants more than one increment ahead however often it renews', () => {
  let window = planWalkIncrement(0);
  for (let now = MIN_MS; now <= 60 * MIN_MS; now += MIN_MS) {
    const next = extendWalkIncrement(window, now);
    expect(next).not.toBeNull();
    expect(next!.endMs - now).toBe(WALK_INCREMENT_MS);
    window = next!;
  }
});

it('cannot revive a lapsed window, so a force-quit costs at most one increment', () => {
  const window = planWalkIncrement(0);
  expect(extendWalkIncrement(window, 20 * MIN_MS)).toBeNull();
  expect(planWalkIncrement(20 * MIN_MS).endMs).toBe(20 * MIN_MS + WALK_INCREMENT_MS);
});

it('is half-open: live until endMs, lapsed at endMs', () => {
  const window = planWalkIncrement(0);
  expect(isWalkWindowActive(window, 0)).toBe(true);
  expect(isWalkWindowActive(window, WALK_INCREMENT_MS - 1)).toBe(true);
  expect(isWalkWindowActive(window, WALK_INCREMENT_MS)).toBe(false);
  expect(isWalkWindowActive(window, -1)).toBe(false);
});

it.each([[null], [undefined]])('treats %s as no window at all', (window) => {
  expect(isWalkWindowActive(window, 0)).toBe(false);
});
