/**
 * merge: P2-T15 provides this as `ports/__tests__/gymContract.ts`. Verbatim apart from the imports.
 * Delete on merge and import the real suite; see ../README.md.
 */
import { gymDwellMinutes, mergedGymVisitIntervals } from '../gymDwell';
import { GymPort, GymVisit } from '../types';

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

    const visit = (id: string, enteredAt: string, exitedAt: string): GymVisit => ({
      id,
      placeId: harness.placeId,
      enteredAt,
      exitedAt,
      source: 'geofence',
    });
    const dwell = async () => {
      const visits = await harness.port.visits('2026-09-07');
      return {
        minutes: gymDwellMinutes(visits, '2026-09-07', 'America/New_York', harness.now()),
        intervals: mergedGymVisitIntervals(visits, '2026-09-07', 'America/New_York', harness.now()),
      };
    };

    test('overlapping visits are counted once', async () => {
      // Two saved gyms with overlapping radii report the same hour; it is one hour, not two.
      harness.replaceVisits([
        visit('a', '2026-09-07T14:00:00.000Z', '2026-09-07T15:00:00.000Z'),
        visit('b', '2026-09-07T14:30:00.000Z', '2026-09-07T15:01:00.000Z'),
      ]);
      harness.advance(2 * 60_000);
      const { minutes, intervals } = await dwell();
      expect(minutes).toBe(61);
      expect(intervals).toHaveLength(1);
    });

    test('an exit and re-enter within two minutes is one visit', async () => {
      harness.replaceVisits([
        visit('a', '2026-09-07T14:00:00.000Z', '2026-09-07T14:30:00.000Z'),
        visit('b', '2026-09-07T14:31:30.000Z', '2026-09-07T15:00:00.000Z'),
      ]);
      harness.advance(2 * 60_000);
      const { minutes, intervals } = await dwell();
      expect(intervals).toHaveLength(1);
      expect(minutes).toBe(60);
    });

    test('a re-entry after more than two minutes is a second visit', async () => {
      harness.replaceVisits([
        visit('a', '2026-09-07T14:00:00.000Z', '2026-09-07T14:30:00.000Z'),
        visit('b', '2026-09-07T14:33:00.000Z', '2026-09-07T15:00:00.000Z'),
      ]);
      harness.advance(2 * 60_000);
      const { minutes, intervals } = await dwell();
      expect(intervals).toHaveLength(2);
      expect(minutes).toBe(57);
    });
  });
}
