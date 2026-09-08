import { Workout } from '../models';
import { HealthPort } from '../HealthPort';

export type HealthContractHarness = {
  port: HealthPort;
  progress(): number;
  flush(): Promise<void>;
  dispose(): void;
};

export function healthContract(name: string, create: () => Promise<HealthContractHarness>) {
  describe(`${name} HealthPort contract`, () => {
    let harness: HealthContractHarness;
    beforeEach(async () => {
      harness = await create();
    });
    afterEach(() => harness.dispose());

    test('a manually entered workout never counts', async () => {
      const workouts: Workout[] = await harness.port.workoutsToday('running');
      expect(workouts.map((workout) => workout.source)).toEqual(['manual', 'device']);
      await harness.flush();
      expect(harness.progress()).toBe(10);
    });
  });
}
