import { FakeClock } from '../../../demo/clock';
import { NOW } from '../../../demo/scenarios/base';
import { resetStores } from '../../../state/stores';
import { healthStub } from '../../__tests__/stubs';
import { healthContract } from '../../../ports/__tests__/healthContract';
import { createHealthAdapter } from '../HealthAdapter';

healthContract('native', async () => {
  resetStores();
  const clock = new FakeClock(NOW, 'America/New_York');
  const engine = healthStub([
    {
      activity: 'running',
      startISO: '2026-09-07T12:00:00.000Z',
      endISO: '2026-09-07T12:20:00.000Z',
      minutes: 20,
      km: 4,
      wasUserEntered: true,
    },
    {
      activity: 'running',
      startISO: '2026-09-07T14:00:00.000Z',
      endISO: '2026-09-07T14:10:00.000Z',
      minutes: 10,
      km: 2,
      wasUserEntered: false,
    },
  ]);
  const port = createHealthAdapter({ clock, engine: engine.engine });

  // Stands in for progressSync, which is the one place that decides a manual entry never counts.
  let progress = 0;
  const sync = port.workoutsToday('running').then((workouts) => {
    progress = workouts
      .filter((workout) => workout.source === 'device')
      .reduce((minutes, workout) => minutes + workout.minutes, 0);
  });

  return {
    port,
    progress: () => progress,
    flush: () => sync,
    dispose: () => clock.dispose(),
  };
});
