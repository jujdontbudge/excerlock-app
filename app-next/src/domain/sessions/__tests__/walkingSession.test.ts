import { WalkingSession } from '../../types';
import { stepWalkingSession } from '../walkingSession';

const session: WalkingSession = {
  id: 'session-1',
  ruleId: 'walk',
  placement: 'handheld',
  instanceDay: '2026-09-07',
  startedAt: '2026-09-07T15:00:00.000Z',
  verifiedAt: '2026-09-07T15:00:00.000Z',
  leaseUntil: '2026-09-07T15:15:00.000Z',
  creditedThrough: '2026-09-07T15:00:00.000Z',
  endedAt: null,
  endReason: null,
  phase: 'walking',
};

const config = {
  leaseMs: 900_000,
  graceMs: 30_000,
  windowEnd: '2026-09-07T15:30:00.000Z',
  dayEnd: '2026-09-08T00:00:00.000Z',
};

test('a verified event inside a live lease extends it by 15 minutes', () => {
  const result = stepWalkingSession(
    session,
    { type: 'verified', at: '2026-09-07T15:14:00.000Z' },
    config,
  );

  expect(result.session.leaseUntil).toBe('2026-09-07T15:29:00.000Z');
  expect(result.session.phase).toBe('walking');
  expect(result.effects).toContainEqual({
    type: 'creditMinutes',
    from: '2026-09-07T15:00:00.000Z',
    to: '2026-09-07T15:14:00.000Z',
  });
});

test('a verified event after the lease has lapsed does not revive it', () => {
  const result = stepWalkingSession(
    session,
    { type: 'verified', at: '2026-09-07T15:15:00.000Z' },
    config,
  );

  expect(result.session).toMatchObject({
    phase: 'ended',
    leaseUntil: session.leaseUntil,
    endedAt: '2026-09-07T15:15:00.000Z',
    endReason: 'leaseLapsed',
  });
  expect(result.effects).toEqual([
    {
      type: 'creditMinutes',
      from: '2026-09-07T15:00:00.000Z',
      to: '2026-09-07T15:15:00.000Z',
    },
    { type: 'ended', reason: 'leaseLapsed' },
  ]);
});

test('a propped scan credits minutes from the scan instant', () => {
  const scanning: WalkingSession = {
    ...session,
    placement: 'propped',
    phase: 'verifying',
    verifiedAt: null,
  };
  const verified = stepWalkingSession(
    scanning,
    { type: 'verified', at: '2026-09-07T15:02:00.000Z' },
    config,
  );
  const ticked = stepWalkingSession(
    verified.session,
    { type: 'tick', at: '2026-09-07T15:14:00.000Z' },
    config,
  );

  expect(verified.effects).toEqual([]);
  expect(ticked.effects).toContainEqual({
    type: 'creditMinutes',
    from: '2026-09-07T15:02:00.000Z',
    to: '2026-09-07T15:14:00.000Z',
  });
  expect(ticked.session.creditedThrough).toBe('2026-09-07T15:14:00.000Z');
});

test('credit is idempotent across a replay', () => {
  const first = stepWalkingSession(
    session,
    { type: 'tick', at: '2026-09-07T15:05:00.000Z' },
    config,
  );
  const replay = stepWalkingSession(
    first.session,
    { type: 'tick', at: '2026-09-07T15:05:00.000Z' },
    config,
  );

  expect(first.effects).toContainEqual({
    type: 'creditMinutes',
    from: '2026-09-07T15:00:00.000Z',
    to: '2026-09-07T15:05:00.000Z',
  });
  expect(replay.effects).toEqual([]);
  expect(replay.session).toEqual(first.session);
});

test('window end stops the session and credits through the window end', () => {
  const result = stepWalkingSession(
    { ...session, leaseUntil: '2026-09-07T16:00:00.000Z' },
    { type: 'tick', at: '2026-09-07T15:40:00.000Z' },
    config,
  );

  expect(result.session).toMatchObject({
    phase: 'ended',
    endedAt: config.windowEnd,
    endReason: 'windowEnded',
    creditedThrough: config.windowEnd,
  });
  expect(result.effects).toEqual([
    { type: 'creditMinutes', from: session.creditedThrough, to: config.windowEnd },
    { type: 'ended', reason: 'windowEnded' },
  ]);
});

test('grace time is not credited and verification cancels its warning', () => {
  const unverified = stepWalkingSession(
    session,
    { type: 'unverified', at: '2026-09-07T15:05:00.000Z' },
    config,
  );
  const resumed = stepWalkingSession(
    unverified.session,
    { type: 'verified', at: '2026-09-07T15:05:20.000Z' },
    config,
  );
  const ticked = stepWalkingSession(
    resumed.session,
    { type: 'tick', at: '2026-09-07T15:06:00.000Z' },
    config,
  );

  expect(unverified.session.graceUntil).toBe('2026-09-07T15:05:30.000Z');
  expect(resumed.effects).toEqual([{ type: 'cancelWarning' }]);
  expect(ticked.effects).toContainEqual({
    type: 'creditMinutes',
    from: '2026-09-07T15:05:20.000Z',
    to: '2026-09-07T15:06:00.000Z',
  });
});

test('a tick inside the last thirty seconds of the lease asks for a warning once', () => {
  const warned = stepWalkingSession(session, { type: 'tick', at: '2026-09-07T15:14:40.000Z' }, config);

  expect(warned.effects).toContainEqual({ type: 'leaseWarning', at: '2026-09-07T15:14:30.000Z' });

  const again = stepWalkingSession(warned.session, { type: 'tick', at: '2026-09-07T15:14:50.000Z' }, config);

  expect(again.effects.some((effect) => effect.type === 'leaseWarning')).toBe(false);
});
