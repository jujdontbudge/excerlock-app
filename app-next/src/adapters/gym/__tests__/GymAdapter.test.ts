import { readFileSync } from 'fs';
import { join } from 'path';
import { FakeClock } from '../../../demo/clock';
import { gymPlace, places } from '../../../demo/places';
import { NOW } from '../../../demo/scenarios/base';
import { permissionsStore } from '../../../state/permissionsStore';
import { settingsStore } from '../../../state/settingsStore';
import { resetStores } from '../../../state/stores';
import { locationStub } from '../../__tests__/stubs';
import { gymDwellMinutes } from '../../pending/gymDwell';
import { GymVisit } from '../../pending/types';
import { createGymAdapter } from '../GymAdapter';
import { memoryVisitLog } from '../visitLog';
import { searchStub } from './searchStub';

let close: (() => void) | undefined;
afterEach(() => {
  close?.();
  close = undefined;
});

function harness(options: { backgroundVisits?: GymVisit[] } = {}) {
  resetStores();
  settingsStore.getState().patch({ gymPlaces: [gymPlace] });
  const clock = new FakeClock(NOW, 'America/New_York');
  const location = locationStub();
  const visitLog = memoryVisitLog();
  const search = searchStub();
  const adapter = createGymAdapter({
    clock,
    engine: location.engine,
    search,
    visitLog,
    backgroundVisits: options.backgroundVisits && (async () => options.backgroundVisits ?? []),
  });
  close = () => {
    adapter.dispose();
    clock.dispose();
  };
  const move = (where: 'inside' | 'outside') =>
    location.locate({
      lat: gymPlace.latitude + (where === 'inside' ? 0 : 0.02),
      lon: gymPlace.longitude,
      accuracy: 5,
      atMs: Date.parse(clock.now()),
    });
  return { adapter, clock, location, visitLog, search, move };
}

describe('GymAdapter', () => {
  test('only enableAutoDetect asks for Always', async () => {
    const h = harness();
    h.move('inside');
    await h.adapter.requestLocation();
    await h.adapter.searchPlaces('West');
    await h.adapter.savePlace({ ...gymPlace, name: 'Renamed' });
    await h.adapter.checkIn(gymPlace.id);
    h.adapter.distanceTo(gymPlace.id);
    h.adapter.listPlaces();
    await h.adapter.visits('2026-09-07');
    h.adapter.disableAutoDetect();
    expect(h.location.requests).not.toContain('always');

    h.location.authorization = 'authorizedAlways';
    expect(await h.adapter.enableAutoDetect()).toBe(true);
    expect(h.location.requests).toContain('always');
  });

  test('the file itself keeps region monitoring inside the two opt-in paths', () => {
    // The acceptance row asks for a grep as well as a behavioural test, because a future caller
    // could reach Always by adding one line somewhere else in this adapter.
    const source = readFileSync(join(__dirname, '..', 'GymAdapter.ts'), 'utf8');
    const callers = source
      .split('\n')
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.includes('startMonitoringRegions('))
      .map(({ index }) => nearestMember(source.split('\n'), index));
    expect(new Set(callers)).toEqual(new Set(['remonitor', 'enableAutoDetect', 'reconcile']));
  });

  test('each gym is monitored at the radius the picker saved', async () => {
    const h = harness();
    h.location.authorization = 'authorizedAlways';
    await h.adapter.savePlace({ ...gymPlace, radiusMeters: 180 });
    await h.adapter.enableAutoDetect();
    expect(h.location.monitored.at(-1)).toEqual([
      { id: gymPlace.id, latitude: gymPlace.latitude, longitude: gymPlace.longitude, radiusMeters: 180 },
    ]);
  });

  test('a radius outside the picker range is clamped, never rejected', async () => {
    const h = harness();
    await h.adapter.savePlace({ ...gymPlace, radiusMeters: 5 });
    expect(h.adapter.listPlaces()[0].radiusMeters).toBe(50);
    await h.adapter.savePlace({ ...gymPlace, radiusMeters: 900 });
    expect(h.adapter.listPlaces()[0].radiusMeters).toBe(200);
  });

  test('the sixth gym is refused', async () => {
    const h = harness();
    settingsStore.getState().patch({ gymPlaces: places.slice(0, 5) });
    await expect(h.adapter.savePlace({ ...gymPlace, id: 'gym-6' })).rejects.toThrow('GYM_LIMIT_REACHED');
  });

  test('a declined Always leaves auto-detect off', async () => {
    const h = harness();
    h.location.authorization = 'authorizedWhenInUse';
    expect(await h.adapter.enableAutoDetect()).toBe(false);
    expect(settingsStore.getState().data.gymAutoDetect).toBe(false);
    expect(permissionsStore.getState().data.location).toBe('whenInUse');
  });

  test('an hour in the gym with the app killed is claimed in full on open', async () => {
    // Decision B31: the geofence task recorded both instants; opening the app only reads them.
    const closed: GymVisit = {
      id: 'geofence:gym-1:locker-room',
      placeId: gymPlace.id,
      enteredAt: '2026-09-07T13:00:00.000Z',
      exitedAt: '2026-09-07T14:00:00.000Z',
      source: 'geofence',
    };
    const h = harness({ backgroundVisits: [closed] });
    settingsStore.getState().patch({ gymAutoDetect: true });
    h.location.authorization = 'authorizedAlways';
    await h.adapter.reconcile();

    const visits = await h.adapter.visits('2026-09-07');
    expect(visits).toContainEqual(closed);
    expect(gymDwellMinutes(visits, '2026-09-07', 'America/New_York', h.clock.now())).toBe(60);
  });

  test('reconcile restores monitoring without prompting, and stays silent without Always', async () => {
    const h = harness();
    settingsStore.getState().patch({ gymAutoDetect: true });
    h.location.authorization = 'authorizedWhenInUse';
    await h.adapter.reconcile();
    expect(h.location.requests).not.toContain('always');
    expect(h.location.monitored).toEqual([]);

    h.location.authorization = 'authorizedAlways';
    await h.adapter.reconcile();
    expect(h.location.monitored.at(-1)).toHaveLength(1);
  });

  test('a check-in from outside the saved gym is refused and opens nothing', async () => {
    const h = harness();
    h.move('outside');
    await expect(h.adapter.checkIn(gymPlace.id)).rejects.toThrow('OUTSIDE_SAVED_GYM');
    expect(await h.adapter.visits('2026-09-07')).toEqual([]);
  });

  test('the confirmation ring settles after the hold and cancels when the user leaves', async () => {
    const h = harness();
    h.move('inside');
    const held = h.adapter.checkIn(gymPlace.id, {
      milliseconds: 30_000,
      signal: new AbortController().signal,
    });
    h.clock.advance(30_000);
    expect((await held).source).toBe('manual');

    const leaving = harness();
    leaving.move('inside');
    const interrupted = leaving.adapter.checkIn(gymPlace.id, {
      milliseconds: 30_000,
      signal: new AbortController().signal,
    });
    leaving.move('outside');
    await expect(interrupted).rejects.toThrow('LEFT_GYM');
  });

  test('a cancelled check-in leaves an interval too short to count', async () => {
    const h = harness();
    h.move('inside');
    const controller = new AbortController();
    const held = h.adapter.checkIn(gymPlace.id, { milliseconds: 30_000, signal: controller.signal });
    h.clock.advance(10_000);
    controller.abort();
    await expect(held).rejects.toThrow('CHECK_IN_CANCELLED');

    const visits = await h.adapter.visits('2026-09-07');
    expect(visits).toHaveLength(1);
    expect(gymDwellMinutes(visits, '2026-09-07', 'America/New_York', h.clock.now())).toBe(0);
  });

  test('saving a gym while auto-detect is on re-registers the regions', async () => {
    const h = harness();
    h.location.authorization = 'authorizedAlways';
    await h.adapter.enableAutoDetect();
    await h.adapter.savePlace({ ...places[1], radiusMeters: 120 });
    expect(h.location.monitored.at(-1)).toHaveLength(2);
  });
});

/** The nearest `name(` or `name: ` above a line, so a grep can name the function it landed in. */
function nearestMember(lines: string[], index: number): string {
  for (let cursor = index; cursor >= 0; cursor--) {
    const match = /^\s{2,4}(?:const |)([A-Za-z]+)(?::\s*(?:async\s*)?\(|\s*=\s*(?:async\s*)?\()/.exec(
      lines[cursor],
    );
    if (match) return match[1];
  }
  return 'module scope';
}
