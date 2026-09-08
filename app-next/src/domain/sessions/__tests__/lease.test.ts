import { WALK_LEASE_MS, isWalkLeaseLive, planWalkLease, renewWalkLease } from '../lease';

const at = '2026-09-07T14:00:00.000Z';

test('a lease runs fifteen minutes from the instant it is planned', () => {
  expect(planWalkLease(at)).toEqual({ startedAt: at, leaseUntil: '2026-09-07T14:15:00.000Z' });
  expect(WALK_LEASE_MS).toBe(15 * 60_000);
});

test('a live lease renews for another fifteen minutes and a lapsed one is never revived', () => {
  const { leaseUntil } = planWalkLease(at);

  expect(isWalkLeaseLive(leaseUntil, '2026-09-07T14:14:59.999Z')).toBe(true);
  expect(renewWalkLease(leaseUntil, '2026-09-07T14:10:00.000Z')).toBe('2026-09-07T14:25:00.000Z');

  // The lease ends the instant it is reached, and nothing after that reopens it.
  expect(isWalkLeaseLive(leaseUntil, leaseUntil)).toBe(false);
  expect(renewWalkLease(leaseUntil, leaseUntil)).toBeNull();
  expect(renewWalkLease(leaseUntil, '2026-09-07T14:20:00.000Z')).toBeNull();
});
