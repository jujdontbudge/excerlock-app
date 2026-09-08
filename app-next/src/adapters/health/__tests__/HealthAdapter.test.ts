import { FakeClock } from '../../../demo/clock';
import { NOW } from '../../../demo/scenarios/base';
import { permissionsStore } from '../../../state/permissionsStore';
import { resetStores } from '../../../state/stores';
import { healthStub } from '../../__tests__/stubs';
import { WorkoutRecord } from '../../engine/contracts';
import { createHealthAdapter } from '../HealthAdapter';

const workout = (over: Partial<WorkoutRecord> = {}): WorkoutRecord => ({
  activity: 'running',
  startISO: '2026-09-07T14:00:00.000Z',
  endISO: '2026-09-07T14:30:00.000Z',
  minutes: 30,
  km: 6,
  wasUserEntered: false,
  ...over,
});

let close: (() => void) | undefined;
afterEach(() => {
  close?.();
  close = undefined;
});

function harness(workouts: WorkoutRecord[] = []) {
  resetStores();
  const clock = new FakeClock(NOW, 'America/New_York');
  const engine = healthStub(workouts);
  const adapter = createHealthAdapter({ clock, engine: engine.engine });
  close = () => clock.dispose();
  return { adapter, clock, engine };
}

describe('HealthAdapter', () => {
  test('today is the local day, not the last twenty-four hours', async () => {
    const h = harness([workout()]);
    await h.adapter.workoutsToday('running');
    const [{ from, to }] = h.engine.queries;
    expect(from.toISOString()).toBe('2026-09-07T04:00:00.000Z');
    expect(to.toISOString()).toBe('2026-09-08T04:00:00.000Z');
  });

  test('a run and a ride are told apart', async () => {
    const h = harness([workout(), workout({ activity: 'cycling', km: 20 }), workout({ activity: 'other' })]);
    expect(await h.adapter.workoutsToday('running')).toEqual([
      { kind: 'running', minutes: 30, km: 6, source: 'device' },
    ]);
    expect(await h.adapter.workoutsToday('biking')).toEqual([
      { kind: 'biking', minutes: 30, km: 20, source: 'device' },
    ]);
  });

  test('a manually entered workout is reported, not hidden', async () => {
    // The user can see it in Health; dropping it here would make the app look broken. The domain
    // decides it never counts.
    const h = harness([workout({ wasUserEntered: true })]);
    expect((await h.adapter.workoutsToday('running'))[0].source).toBe('manual');
  });

  test('yesterday evening does not count toward today', async () => {
    const h = harness([
      workout({ startISO: '2026-09-07T03:30:00.000Z', endISO: '2026-09-07T04:10:00.000Z' }),
      workout(),
    ]);
    expect(await h.adapter.workoutsToday('running')).toHaveLength(1);
  });

  test('background delivery is bootstrapped once', async () => {
    const h = harness();
    await h.adapter.request();
    await h.adapter.bootstrap();
    expect(h.engine.backgroundDeliveryCalls).toBe(1);
  });

  test('a denied request never turns background delivery on', async () => {
    const h = harness();
    h.engine.authorization = 'denied';
    expect(await h.adapter.request()).toBe('denied');
    expect(h.engine.backgroundDeliveryCalls).toBe(0);
    expect(permissionsStore.getState().data.health).toBe('denied');
  });

  test('a query that fails reports no workouts rather than throwing', async () => {
    resetStores();
    const clock = new FakeClock(NOW, 'America/New_York');
    const engine = healthStub();
    const errors: unknown[] = [];
    engine.engine.queryWorkouts = async () => {
      throw new Error('HKErrorAuthorizationDenied');
    };
    const adapter = createHealthAdapter({ clock, engine: engine.engine, onError: (e) => errors.push(e) });
    close = () => clock.dispose();
    expect(await adapter.workoutsToday('running')).toEqual([]);
    expect(errors).toHaveLength(1);
  });

  test('an unavailable HealthKit reads as restricted', async () => {
    const h = harness();
    h.engine.authorization = 'restricted';
    expect(h.adapter.authorizationStatus()).toBe('restricted');
    expect(permissionsStore.getState().data.health).toBe('restricted');
  });
});
