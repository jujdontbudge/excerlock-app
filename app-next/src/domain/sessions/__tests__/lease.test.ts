import { WALK_LEASE_MS, isWalkLeaseLive, planWalkLease, renewWalkLease } from '../lease';

const startedAt = '2026-09-07T15:00:00.000Z';
const at = (minutes: number) => new Date(Date.parse(startedAt) + minutes * 60_000).toISOString();

test('a planned lease runs fifteen minutes from the start, an increment nobody can raise', () => {
  expect(planWalkLease(startedAt)).toEqual({ startedAt, leaseUntil: '2026-09-07T15:15:00.000Z' });
  expect(WALK_LEASE_MS).toBe(900_000);
});

test('a lease is live until its last instant', () => {
  expect(isWalkLeaseLive('2026-09-07T15:15:00.000Z', '2026-09-07T15:14:59.999Z')).toBe(true);
  expect(isWalkLeaseLive('2026-09-07T15:15:00.000Z', '2026-09-07T15:15:00.000Z')).toBe(false);
});

test('renewal restarts the default lease from the verification, and a lapsed lease is never revived', () => {
  expect(renewWalkLease('2026-09-07T15:15:00.000Z', '2026-09-07T15:10:00.000Z')).toBe('2026-09-07T15:25:00.000Z');
  expect(renewWalkLease('2026-09-07T15:15:00.000Z', '2026-09-07T15:20:00.000Z')).toBeNull();
});

test('no run of renewals grants more than one increment ahead', () => {
  let leaseUntil = planWalkLease(startedAt).leaseUntil;
  for (let minute = 1; minute <= 60; minute += 1) {
    const renewed = renewWalkLease(leaseUntil, at(minute));
    expect(renewed).not.toBeNull();
    expect(Date.parse(renewed!) - Date.parse(at(minute))).toBe(WALK_LEASE_MS);
    leaseUntil = renewed!;
  }
});

test('a lapse costs one increment: only a fresh start reopens access', () => {
  const lapsed = planWalkLease(startedAt).leaseUntil;
  expect(renewWalkLease(lapsed, at(20))).toBeNull();
  expect(planWalkLease(at(20)).leaseUntil).toBe(at(35));
});
