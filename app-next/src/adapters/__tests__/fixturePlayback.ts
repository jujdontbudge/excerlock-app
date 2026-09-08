import { getMotionFixture } from '../../engine/signals/motion/fixtures';
import { FixtureMotionProvider } from '../../engine/signals/motion/FixtureMotionProvider';
import type { MotionFixtureName } from '../../engine/signals/motion/fixtures';
import { getLocationFixture } from '../../engine/signals/location/fixtures';
import { FixtureLocationProvider } from '../../engine/signals/location/FixtureLocationProvider';
import type { LocationFixtureName } from '../../engine/signals/location/fixtures';
import type {
  ActivitySample,
  CadenceSample,
  GymLocationEngine,
  LocationAuthorizationStatus,
  LocationSample,
  MotionProvider,
  RegionTransition,
  Unsubscribe,
} from '../engine/contracts';

/**
 * Replays one of P2-T03's recorded motion fixtures against an adapter.
 *
 * A fixture timeline is relative: it starts at zero and every row is an offset. The adapters read
 * wall-clock instants, so playback shifts each sample onto the session's own origin. Nothing else
 * is changed — the samples, their order and their gaps are the recording's.
 */
export type MotionPlayback = {
  provider: MotionProvider;
  /** Advances the recording to `atMs` past its origin, firing every row in between. */
  playTo(offsetMs: number): void;
  /** The recording's own start, as an epoch instant. */
  readonly originMs: number;
};

export function replayMotion(name: MotionFixtureName, originMs: number): MotionPlayback {
  const fixture = new FixtureMotionProvider(getMotionFixture(name));
  const shiftActivity = (sample: ActivitySample): ActivitySample => ({
    ...sample,
    startedAt: sample.startedAt + originMs,
    receivedAt: sample.receivedAt + originMs,
  });
  const shiftCadence = (sample: CadenceSample): CadenceSample => ({
    ...sample,
    asOf: sample.asOf + originMs,
  });
  return {
    originMs,
    playTo: (offsetMs) => fixture.advanceTo(offsetMs),
    provider: {
      getAvailability: () => fixture.getAvailability(),
      getAuthorizationStatus: () => fixture.getAuthorizationStatus(),
      requestAuthorization: () => fixture.requestAuthorization(),
      start: () => fixture.start(),
      stop: () => fixture.stop(),
      queryActivity: async (fromMs, toMs) =>
        (await fixture.queryActivity(fromMs - originMs, toMs - originMs)).map(shiftActivity),
      querySteps: (fromMs, toMs) => fixture.querySteps(fromMs - originMs, toMs - originMs),
      on: ((event: 'activity' | 'cadence', callback: (sample: never) => void): Unsubscribe =>
        event === 'activity'
          ? fixture.on('activity', (sample) => (callback as (s: ActivitySample) => void)(shiftActivity(sample)))
          : fixture.on('cadence', (sample) =>
              (callback as (s: CadenceSample) => void)(shiftCadence(sample)),
            )) as MotionProvider['on'],
    },
  };
}

/** The same shift for the recorded geofence timelines. */
export type LocationPlayback = {
  engine: GymLocationEngine;
  playTo(offsetMs: number): void;
  readonly originMs: number;
};

export function replayLocation(name: LocationFixtureName, originMs: number): LocationPlayback {
  const fixture = new FixtureLocationProvider(getLocationFixture(name));
  const shiftTransition = (value: RegionTransition): RegionTransition => ({
    ...value,
    atMs: value.atMs + originMs,
  });
  const shiftSample = (value: LocationSample): LocationSample => ({ ...value, atMs: value.atMs + originMs });
  return {
    originMs,
    playTo: (offsetMs) => fixture.advanceTo(offsetMs),
    engine: {
      requestAuthorization: () => fixture.requestAuthorization(),
      getAuthorizationStatus: () => fixture.getAuthorizationStatus(),
      startMonitoringRegions: (regions) => fixture.startMonitoringRegions(regions),
      stopMonitoringRegions: (regionIds) => fixture.stopMonitoringRegions(regionIds),
      isInsideRegion: (regionId) => fixture.isInsideRegion(regionId),
      getLastLocation: () => {
        const sample = fixture.getLastLocation();
        return sample ? shiftSample(sample) : null;
      },
      startWalkKeepAlive: () => fixture.startWalkKeepAlive(),
      stopWalkKeepAlive: () => fixture.stopWalkKeepAlive(),
      isWalkKeepAliveActive: () => fixture.isWalkKeepAliveActive(),
      checkIn: (region) => fixture.checkIn(region),
      on: ((event: 'region' | 'location' | 'authorization', callback: (value: never) => void): Unsubscribe => {
        if (event === 'region') {
          return fixture.on('region', (value) =>
            (callback as (v: RegionTransition) => void)(shiftTransition(value)),
          );
        }
        if (event === 'location') {
          return fixture.on('location', (value) =>
            (callback as (v: LocationSample) => void)(shiftSample(value)),
          );
        }
        return fixture.on('authorization', callback as (v: LocationAuthorizationStatus) => void);
      }) as GymLocationEngine['on'],
    },
  };
}
