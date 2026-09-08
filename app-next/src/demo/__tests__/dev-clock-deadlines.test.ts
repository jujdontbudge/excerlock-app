import { FakeContext } from '../FakeContext';
import { GymFake } from '../fakes/GymFake';
import { WalkingFake } from '../fakes/WalkingFake';
import { gymPlace } from '../places';
import { scenarios } from '../scenarios';
import { resetStores } from '../../state/stores';
import { rulesStore } from '../../state/rulesStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { settingsStore } from '../../state/settingsStore';

// One clock owns every product deadline, so a dev-menu time jump resolves them all in the same pass.
test('the gym ring, the lease and the framing grace all advance with the dev clock', async () => {
  resetStores();
  const scenario = scenarios.find((s) => s.id === 'walking-lease-renewal')!;
  const ctx = new FakeContext({ ...scenario, gym: { places: [gymPlace], presence: 'inside' } });
  rulesStore.getState().patch({ rules: scenario.rules });
  settingsStore.getState().patch({ gymPlaces: [gymPlace] });
  const walking = WalkingFake(ctx);
  const gym = GymFake(ctx);

  const session = await walking.start(scenario.rules[0]);
  walking.signal('unverified'); // opens the framing grace, 30 seconds by the stop-grace setting
  expect(ruleDaysStore.getState().data.walkingSession).toMatchObject({ phase: 'grace' });

  let ring: string | null = null;
  const controller = new AbortController();
  const checkedIn = gym
    .checkIn(gymPlace.id, { milliseconds: 30_000, signal: controller.signal })
    .then((visit) => {
      ring = visit.enteredAt;
    });
  expect(ring).toBeNull();

  ctx.clock.advance(16 * 60_000);
  await checkedIn;

  expect(ring).toBe(session.startedAt);
  expect(ruleDaysStore.getState().data.walkingSession).toMatchObject({
    phase: 'ended',
    endReason: 'graceExpired',
    endedAt: new Date(Date.parse(session.startedAt) + 30_000).toISOString(),
  });

  walking.disconnect();
  gym.dispose();
  ctx.dispose();
});
