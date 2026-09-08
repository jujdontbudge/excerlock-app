import { FakeClock } from '../../../demo/clock';
import { gymPlace } from '../../../demo/places';
import { NOW } from '../../../demo/scenarios/base';
import { settingsStore } from '../../../state/settingsStore';
import { resetStores } from '../../../state/stores';
import { locationStub } from '../../__tests__/stubs';
import { gymContract } from '../../../ports/__tests__/gymContract';
import { createGymAdapter } from '../GymAdapter';
import { memoryVisitLog } from '../visitLog';
import { searchStub } from './searchStub';

gymContract('native', () => {
  resetStores();
  settingsStore.getState().patch({ gymPlaces: [gymPlace] });
  const clock = new FakeClock(NOW, 'America/New_York');
  const location = locationStub();
  const visitLog = memoryVisitLog();
  const port = createGymAdapter({ clock, engine: location.engine, search: searchStub(), visitLog });

  return {
    port,
    placeId: gymPlace.id,
    now: clock.now,
    advance: clock.advance,
    // Presence on the When-in-use tier is a foreground fix, so the harness moves the device.
    setPresence: (presence) =>
      location.locate({
        lat: gymPlace.latitude + (presence === 'inside' ? 0 : 0.02),
        lon: gymPlace.longitude,
        accuracy: 5,
        atMs: Date.parse(clock.now()),
      }),
    replaceVisits: (visits) => visitLog.write(visits),
    dispose: () => {
      port.dispose();
      clock.dispose();
    },
  };
});
