import { createDraft } from '../../../rules/draft';
import { advanceDemo, beginHold, endHold, initialDemo, phasesFor, scenarioFor, snapshot, stride } from '../model';

const outside = { kind: 'walk-state', place: 'outside', goal: 0 } as const;
const treadmill = { ...outside, place: 'treadmill' } as const;
test('maps every shipping draft mode and selected thresholds', () => {
  const d = createDraft('walking');
  expect(scenarioFor(d, '')).toEqual({ kind: 'walk-steps', place: 'outside', goal: 10000 });
  expect(scenarioFor({ ...d, walkingMode: 'minutes', walkMinutes: 37 }, '')).toMatchObject({
    kind: 'walk-minutes',
    goal: 37,
  });
  expect(scenarioFor({ ...d, walkingMode: 'state' }, 'treadmill')).toEqual(treadmill);
  expect(scenarioFor({ ...d, activity: 'gym', gymMode: 'arrival' }, '')).toMatchObject({ kind: 'gym-arrival' });
  expect(scenarioFor({ ...d, activity: 'gym', gymMode: 'time', gymMinutes: 45 }, '')).toMatchObject({ kind: 'gym-minutes', goal: 45 });
  expect(scenarioFor({ ...d, activity: 'gym', gymMode: 'presence', gymMinutes: 30 }, '')).toEqual({ kind: 'gym-presence', place: 'outside', goal: 0 });
});
test('"Be at the gym" unlocks only while there and locks again on leaving, with no timer', () => {
  const presence = { kind: 'gym-presence', place: 'outside', goal: 0 } as const;
  expect(phasesFor(presence).map((p) => p.name)).toEqual(['approach', 'confirming', 'unlocked', 'leave']);
  expect(snapshot({ ...initialDemo(), time: 8 }, presence)).toMatchObject({
    phase: 'unlocked', locked: false, phone: 'tiktok', title: 'Unlocked while at the gym',
  });
  expect(snapshot({ ...initialDemo(), time: 12 }, presence)).toMatchObject({
    phase: 'leave', locked: true, phone: 'shield', goalMet: false, title: 'Apps are blocked',
  });
});
test.each([
  [outside, 8],
  [treadmill, 13],
  [{ kind: 'walk-steps', place: 'outside', goal: 5000 }, 11],
  [{ kind: 'walk-minutes', place: 'outside', goal: 30 }, 11],
  [{ kind: 'gym-arrival', place: 'outside', goal: 0 }, 13],
  [{ kind: 'gym-minutes', place: 'outside', goal: 45 }, 18],
  [{ kind: 'gym-presence', place: 'outside', goal: 0 }, 14],
] as const)('phase durations match the accepted storyboard: %j', (scenario, duration) => {
  expect(phasesFor(scenario).reduce((n, p) => n + p.duration, 0)).toBe(duration);
});
test('treadmill setup and scan do not claim apps are already unlocked', () => {
  expect(snapshot(initialDemo(), treadmill)).toMatchObject({ phase: 'prop', locked: true, phone: 'excerlock' });
  expect(snapshot({ ...initialDemo(), time: 3 }, treadmill)).toMatchObject({
    phase: 'scan',
    locked: true,
    phone: 'excerlock',
  });
});
test('manual press unlocks instantly, release blocks, three seconds restores automatic walking', () => {
  const stopped = { ...initialDemo(), time: 6 };
  const held = beginHold(stopped, outside);
  expect(snapshot(held, outside)).toMatchObject({ walking: true, locked: false, phone: 'tiktok' });
  const released = endHold(held);
  expect(snapshot(released, outside)).toMatchObject({ walking: false, locked: true, phone: 'shield' });
  expect(advanceDemo(released, outside, 2.99).manual).toBe('blocked');
  const resumed = advanceDemo(released, outside, 3);
  expect(resumed.manual).toBe(null);
  expect(snapshot(resumed, outside).walking).toBe(true);
});
test('world and stride share a walking-only clock, including crossing a stop boundary', () => {
  const moving = advanceDemo(initialDemo(), outside, 1);
  expect(moving.walkTime).toBe(1);
  expect(moving.distance).toBe(60);
  const crossing = advanceDemo({ ...moving, time: 4.95 }, outside, 0.1);
  expect(crossing.walkTime).toBeCloseTo(1.05);
  expect(crossing.distance).toBeCloseTo(63);
  const frozen = advanceDemo(crossing, outside, 1);
  expect(frozen.walkTime).toBe(crossing.walkTime);
  expect(frozen.distance).toBe(crossing.distance);
});
test('cyclic crossfade has continuous adjacent poses at the seam', () => {
  expect(stride(0)).toEqual({ first: 2, second: 1, mix: 0 });
  expect(stride(7.5 / 9)).toEqual({ first: 3, second: 2, mix: 0.5 });
  expect(stride(8 / 9)).toEqual(stride(0));
});
test('review preset small goal never renders negative progress', () => {
  const scenario = { kind: 'walk-steps', place: 'outside', goal: 10 } as const;
  expect(snapshot(initialDemo(), scenario).progress).toBe(0);
  expect(snapshot({ ...initialDemo(), time: 7 }, scenario).progress).toBe(10);
});
test('goal remains unmet until unlock, and gym time unlocks during presence', () => {
  const steps = { kind: 'walk-steps', place: 'outside', goal: 500 } as const;
  expect(snapshot({ ...initialDemo(), time: 6.999 }, steps)).toMatchObject({ locked: true, progress: 450 });
  expect(snapshot({ ...initialDemo(), time: 7 }, steps)).toMatchObject({ locked: false, progress: 500 });
  const gym = { kind: 'gym-minutes', place: 'outside', goal: 45 } as const;
  expect(snapshot({ ...initialDemo(), time: 7 }, gym)).toMatchObject({ locked: false, phone: 'tiktok', progress: 0 });
  expect(snapshot({ ...initialDemo(), time: 17 }, gym)).toMatchObject({ locked: false, progress: 45 });
});
