import { gymContract } from '../../ports/__tests__/gymContract';
import { gymVisitsStore } from '../../state/gymVisitsStore';
import { resetStores } from '../../state/stores';
import { settingsStore } from '../../state/settingsStore';
import { FakeContext } from '../FakeContext';
import { GymFake } from '../fakes/GymFake';
import { gymPlace } from '../places';
import { base } from '../scenarios/base';

gymContract('fake', () => {
  resetStores();
  const ctx = new FakeContext(
    base('gym-contract', 'Gym contract', { gym: { places: [gymPlace], presence: 'outside' } }),
  );
  settingsStore.getState().patch({ gymPlaces: [gymPlace] });
  const port = GymFake(ctx);
  return {
    port,
    placeId: gymPlace.id,
    now: ctx.clock.now,
    advance: ctx.clock.advance,
    setPresence: (presence) => ctx.update({ presence }),
    replaceVisits: (visits) => gymVisitsStore.getState().patch({ visits }),
    dispose: () => {
      port.dispose();
      ctx.dispose();
    },
  };
});
