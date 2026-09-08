import { gymDwellMinutes, mergedGymVisitIntervals } from '../../domain/gymDwell';
import { GymVisit } from '../../domain/types';
import { GymPort } from '../GymPort';

export type GymContractHarness = {
  port: GymPort;
  placeId: string;
  now(): string;
  advance(milliseconds: number): void;
  setPresence(presence: 'inside' | 'outside'): void;
  replaceVisits(visits: GymVisit[]): void;
  dispose(): void;
};

export function gymContract(name: string, create: () => GymContractHarness) {
  describe(`${name} GymPort contract`, () => {
    let harness: GymContractHarness;
    beforeEach(() => {
      harness = create();
    });
    afterEach(() => harness.dispose());

    test('checkIn returns the visit it opened and publishes it', async () => {
      harness.setPresence('inside');
      const observed: GymVisit[][] = [];
      const stop = harness.port.observeVisits((visits) => observed.push(visits));
      const opened = await harness.port.checkIn(harness.placeId);
      expect(opened).toMatchObject({ placeId: harness.placeId, exitedAt: null, source: 'manual' });
      expect((await harness.port.visits('2026-09-07')).at(-1)).toEqual(opened);
      expect(observed.at(-1)).toContainEqual(opened);
      stop();
    });

    test('a closed visit credits its full enter-to-exit interval', async () => {
      harness.setPresence('inside');
      await harness.port.checkIn(harness.placeId);
      harness.advance(60 * 60_000);
      harness.setPresence('outside');
      const visits = await harness.port.visits('2026-09-07');
      expect(gymDwellMinutes(visits, '2026-09-07', 'America/New_York', harness.now())).toBe(60);
    });

    test('overlapping visits count once and a two-minute re-entry stays one visit', async () => {
      harness.replaceVisits([
        {
          id: 'a',
          placeId: harness.placeId,
          enteredAt: '2026-09-07T14:00:00.000Z',
          exitedAt: '2026-09-07T15:00:00.000Z',
          source: 'geofence',
        },
        {
          id: 'b',
          placeId: harness.placeId,
          enteredAt: '2026-09-07T14:30:00.000Z',
          exitedAt: '2026-09-07T15:01:00.000Z',
          source: 'geofence',
        },
      ]);
      harness.advance(2 * 60_000);
      const visits = await harness.port.visits('2026-09-07');
      expect(gymDwellMinutes(visits, '2026-09-07', 'America/New_York', harness.now())).toBe(61);
      expect(mergedGymVisitIntervals(visits, '2026-09-07', 'America/New_York', harness.now())).toHaveLength(1);
    });
  });
}
