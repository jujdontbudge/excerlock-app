import { FakeClock } from '../../../demo/clock';
import { permissionsStore } from '../../../state/permissionsStore';
import { resetStores } from '../../../state/stores';
import { motionStub } from '../../__tests__/stubs';
import { createStepsAdapter } from '../StepsAdapter';

const NOON = '2026-09-07T16:00:00.000Z'; // 12:00 America/New_York
const MIDNIGHT = '2026-09-08T04:00:00.000Z'; // the next local midnight

let close: (() => void) | undefined;
afterEach(() => {
  close?.();
  close = undefined;
});

function harness() {
  resetStores();
  const clock = new FakeClock(NOON, 'America/New_York');
  const motion = motionStub();
  const adapter = createStepsAdapter({ clock, motion: motion.provider });
  close = () => {
    adapter.dispose();
    clock.dispose();
  };
  return { adapter, clock, motion };
}

/** `subscribe` starts the pedometer and anchors the day across several awaits. */
const settle = async () => {
  for (let hop = 0; hop < 8; hop++) await Promise.resolve();
};

describe('StepsAdapter', () => {
  test('the day total is a historical query anchored at local midnight', async () => {
    const { adapter, motion } = harness();
    motion.steps.value = 3200;
    const seen: number[] = [];
    adapter.subscribe((steps) => seen.push(steps));
    await settle();

    expect(seen.at(-1)).toBe(3200);
    // Local midnight, not UTC and not "24 hours ago" (decision B8).
    expect(new Date(motion.steps.queries[0].fromMs).toISOString()).toBe('2026-09-07T04:00:00.000Z');
  });

  test('live cadence adds to the anchored total instead of replacing it', async () => {
    const { adapter, clock, motion } = harness();
    motion.steps.value = 3200;
    const seen: number[] = [];
    adapter.subscribe((steps) => seen.push(steps));
    await settle();

    // cumulativeSteps counts from the moment live updates began, so it is a delta, never a total.
    clock.advance(60_000);
    motion.emitCadence({ asOf: Date.parse(clock.now()), cumulativeSteps: 90 });
    expect(seen.at(-1)).toBe(3290);

    clock.advance(60_000);
    motion.emitCadence({ asOf: Date.parse(clock.now()), cumulativeSteps: 210 });
    expect(seen.at(-1)).toBe(3410);
  });

  test('the pedometer never counts the same step twice at the anchor', async () => {
    const { adapter, motion } = harness();
    motion.steps.value = 3200;
    const seen: number[] = [];
    adapter.subscribe((steps) => seen.push(steps));
    await settle();

    // The historical query stops where live updates start, so the first live sample adds nothing.
    const [{ toMs }] = motion.steps.queries;
    expect(toMs).toBe(Date.parse(NOON));
    motion.emitCadence({ asOf: toMs, cumulativeSteps: 0 });
    expect(seen.at(-1)).toBe(3200);
  });

  test('midnight resets the day and keeps counting from the live pedometer', async () => {
    const { adapter, clock, motion } = harness();
    motion.steps.value = 3200;
    const seen: number[] = [];
    adapter.subscribe((steps) => seen.push(steps));
    await settle();

    motion.emitCadence({ asOf: Date.parse(clock.now()), cumulativeSteps: 800 });
    expect(seen.at(-1)).toBe(4000);

    clock.set(MIDNIGHT);
    expect(seen.at(-1)).toBe(0);
    motion.emitCadence({ asOf: Date.parse(clock.now()), cumulativeSteps: 950 });
    expect(seen.at(-1)).toBe(150);
  });

  test('a foreground refresh re-reads the day the app slept through', async () => {
    const { adapter, clock, motion } = harness();
    motion.steps.value = 3200;
    const seen: number[] = [];
    adapter.subscribe((steps) => seen.push(steps));
    await settle();

    // Steps taken with the app suspended reach the day total only through a fresh query: the
    // DeviceActivity extension cannot read the pedometer, so this is the moment a goal is noticed.
    clock.advance(30 * 60_000);
    motion.steps.value = 6100;
    expect(await adapter.refresh()).toBe(6100);
    expect(seen.at(-1)).toBe(6100);

    motion.emitCadence({ asOf: Date.parse(clock.now()), cumulativeSteps: 40 });
    expect(seen.at(-1)).toBe(6140);
  });

  test('the pedometer stops when the last subscriber leaves', async () => {
    const { adapter, motion } = harness();
    const stop = adapter.subscribe(() => undefined);
    await settle();
    expect(motion.running()).toBe(true);
    stop();
    await settle();
    expect(motion.running()).toBe(false);
  });

  test('a failed query leaves the last known total and does not throw', async () => {
    resetStores();
    const clock = new FakeClock(NOON, 'America/New_York');
    const motion = motionStub();
    const errors: unknown[] = [];
    motion.provider.querySteps = async () => {
      throw new Error('CMErrorMotionActivityNotAuthorized');
    };
    const adapter = createStepsAdapter({ clock, motion: motion.provider, onError: (e) => errors.push(e) });
    close = () => {
      adapter.dispose();
      clock.dispose();
    };
    const seen: number[] = [];
    adapter.subscribe((steps) => seen.push(steps));
    await settle();
    expect(seen).toEqual([0]);
    expect(errors).toHaveLength(1);
  });

  test('every authorization answer is recorded for Settings to read', async () => {
    const { adapter, motion } = harness();
    motion.authorization = 'notDetermined';
    expect(adapter.authorizationStatus()).toBe('notDetermined');

    motion.authorization = 'authorized';
    expect(await adapter.request()).toBe('granted');
    expect(permissionsStore.getState().data.motion).toBe('granted');

    motion.authorization = 'restricted';
    expect(adapter.authorizationStatus()).toBe('restricted');
    expect(permissionsStore.getState().data.motion).toBe('restricted');
  });
});
