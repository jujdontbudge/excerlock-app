import { FakeClock } from '../../../demo/clock';
import { gymPlace } from '../../../demo/places';
import { NOW } from '../../../demo/scenarios/base';
import { dayKey } from '../../../domain/calendar';
import { settingsStore } from '../../../state/settingsStore';
import { resetStores } from '../../../state/stores';
import { replayLocation } from '../../__tests__/fixturePlayback';
import type { LocationFixtureName } from '../../../engine/signals/location/fixtures';
import { gymDwellMinutes } from '../../pending/gymDwell';
import { createGymAdapter } from '../GymAdapter';
import { memoryVisitLog } from '../visitLog';
import { searchStub } from './searchStub';

/**
 * The adapter against the recorded geofence timelines P2-T03 moved.
 *
 * `region-blip` is the one that matters. A driver stopped at the light outside the gym enters and
 * leaves the region in four seconds, and the adapter has no arithmetic of its own to stop that
 * paying out: it records both instants and lets `gymDwell` decide. This proves the pair is right.
 */

/** The fixtures name their region `gym-primary` and put it in Manhattan. */
const place = { ...gymPlace, id: 'gym-primary', latitude: 40.741, longitude: -73.989, radiusMeters: 100 };

let close: (() => void) | undefined;
afterEach(() => {
  close?.();
  close = undefined;
});

async function play(fixture: LocationFixtureName, throughMs: number) {
  resetStores();
  settingsStore.getState().patch({ gymPlaces: [place] });
  const clock = new FakeClock(NOW, 'America/New_York');
  const origin = Date.parse(NOW);
  const location = replayLocation(fixture, origin);
  const visitLog = memoryVisitLog();
  const adapter = createGymAdapter({ clock, engine: location.engine, search: searchStub(), visitLog });
  close = () => {
    adapter.dispose();
    clock.dispose();
  };
  await adapter.enableAutoDetect();
  location.playTo(throughMs);
  clock.set(new Date(origin + throughMs).toISOString());
  const at = new Date(origin + throughMs).toISOString();
  return {
    adapter,
    visits: () => visitLog.read(),
    minutes: () => gymDwellMinutes(visitLog.read(), dayKey(NOW, 'America/New_York'), 'America/New_York', at),
  };
}

describe('GymAdapter over the recorded geofence timelines', () => {
  test('an hour in the gym is one visit, recorded as two instants', async () => {
    const run = await play('gym-enter-exit', 60_000);
    const visits = run.visits();
    expect(visits).toHaveLength(1);
    expect(visits[0]).toMatchObject({ placeId: 'gym-primary', source: 'geofence' });
    expect(visits[0]?.exitedAt).not.toBeNull();
    // The adapter counted nothing. The instants are the record and the domain does the arithmetic.
    expect(run.minutes()).toBeCloseTo(59 / 60, 3);
  });

  test('a four-second blip past the door earns nothing', async () => {
    const run = await play('region-blip', 5_000);
    // The visit is still recorded — it happened — but it is under the confirmation window, so it
    // is worth zero minutes. Nothing had to be discarded to get that answer.
    expect(run.visits()).toHaveLength(1);
    expect(run.minutes()).toBe(0);
  });

  test('a quiet day opens no visit at all', async () => {
    const run = await play('quiet', 60_000);
    expect(run.visits()).toEqual([]);
  });
});
