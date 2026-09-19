import type { GymTransitionRecord, GymVisitLog } from '../GymVisitLog';
import type { LocationSample } from '..';
import { LocationTaskRuntime } from '../LocationTaskRuntime';
describe('LocationTaskRuntime', () => {
  it('persists quick enter-exit in order and reports explicit exit immediately', async () => {
    jest.useFakeTimers({ now: 1_000 });
    const log = new RecordingGymVisitLog();
    const runtime = new LocationTaskRuntime(log);
    const transitions: string[] = [];
    runtime.onRegionTransition((event) => transitions.push(`${event.type}:${event.regionId}`));
    await runtime.handleGeofencingTask({ eventType: 1, region: { identifier: 'gym-a' } });
    jest.setSystemTime(5_000);
    await runtime.handleGeofencingTask({ eventType: 2, region: { identifier: 'gym-a' } });
    expect(runtime.getCachedRegionPresence('gym-a')).toBe(false);
    expect(transitions).toEqual(['exit:gym-a']);
    expect(log.records.map((row) => row.type)).toEqual(['enter', 'exit']);
    jest.useRealTimers();
  });
  it('delivers continuous task locations through the provider sample shape', () => {
    const runtime = new LocationTaskRuntime(new RecordingGymVisitLog());
    const samples: LocationSample[] = [];
    runtime.onLocation((sample) => samples.push(sample));
    runtime.handleLocationTask({
      locations: [{ coords: { latitude: 40.741, longitude: -73.989, accuracy: 8 }, timestamp: 2_000 }],
    });
    expect(samples).toEqual([{ lat: 40.741, lon: -73.989, accuracy: 8, atMs: 2_000, speedMps: null, courseDeg: null }]);
  });
  it('passes GPS speed and course through, and reads Core Location’s -1 sentinels as unknown', () => {
    const runtime = new LocationTaskRuntime(new RecordingGymVisitLog());
    const samples: LocationSample[] = [];
    runtime.onLocation((sample) => samples.push(sample));
    runtime.handleLocationTask({
      locations: [
        { coords: { latitude: 40.741, longitude: -73.989, accuracy: 5, speed: 1.4, heading: 271.5 }, timestamp: 3_000 },
        { coords: { latitude: 40.742, longitude: -73.989, accuracy: 5, speed: -1, heading: -1 }, timestamp: 4_000 },
      ],
    });
    expect(samples.map((sample) => [sample.speedMps, sample.courseDeg])).toEqual([[1.4, 271.5], [null, null]]);
    expect(runtime.getLastLocation()).toMatchObject({ atMs: 4_000, speedMps: null, courseDeg: null });
  });
});
class RecordingGymVisitLog implements GymVisitLog {
  readonly records: GymTransitionRecord[] = [];
  async append(record: GymTransitionRecord): Promise<void> {
    this.records.push(record);
  }
  async readAll(): Promise<readonly GymTransitionRecord[]> {
    return this.records;
  }
}
