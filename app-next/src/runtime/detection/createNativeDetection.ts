import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeMotionProvider } from '../../engine/signals/motion/NativeMotionProvider';
import { createExcerlockMotionModuleClient } from '../../engine/signals/motion/MotionModuleClient';
import { NativePhonePlacementProvider } from '../../engine/signals/placement/NativePhonePlacementProvider';
import { createPhonePlacementModuleClient } from '../../engine/signals/placement/PhonePlacementModuleClient';
import { createNativeLocationProvider } from '../../engine/signals/location/createNativeLocationProvider';
import { AsyncStorageGymVisitLog } from '../../engine/signals/location/AsyncStorageGymVisitLog';
import { detectionStore } from '../../state/detectionStore';
import { MotionAdapter } from './MotionAdapter';
import { PlacementAdapter } from './PlacementAdapter';
import { DetectionService, type DetectionWake } from './DetectionService';
import { AwakeSession } from './AwakeSession';
import { StepsDetectionAdapter } from './StepsDetectionAdapter';
import { registerHeadlessDetectionHandler } from './headlessRegistry';
import { GymRegionAdapter } from './GymRegionAdapter';
import { HistoryCreditLedger } from './HistoryCreditLedger';
import { WalkingDurationLedger } from './WalkingDurationLedger';
export type NativeDetectionFactoryOptions = {
  getWakeContext(): Omit<DetectionWake, 'now' | 'source'>;
  onError?(error: unknown): void;
  /** Full runtime root owns headless reconciliation when false. */
  registerHeadless?: boolean;
};
export function createNativeDetection(options: NativeDetectionFactoryOptions) {
  const rawMotion = new NativeMotionProvider(createExcerlockMotionModuleClient());
  const rawPlacement = new NativePhonePlacementProvider(createPhonePlacementModuleClient());
  const location = createNativeLocationProvider();
  const gymLog = new AsyncStorageGymVisitLog();
  const motion = new MotionAdapter(rawMotion);
  const placement = new PlacementAdapter(rawPlacement);
  const historyLedger = new HistoryCreditLedger(AsyncStorage);
  const walkingDurationLedger = new WalkingDurationLedger(AsyncStorage);
  const service = new DetectionService({
    motion,
    placement,
    gymLog,
    historyLedger,
    walkingDurationLedger,
    walkingTimezone: () => options.getWakeContext().timezone,
    onError: options.onError,
  });
  const awake = new AwakeSession(location);
  const steps = new StepsDetectionAdapter(rawMotion);
  const unregisterHeadless = options.registerHeadless === false ? () => {} : registerHeadlessDetectionHandler(async () => {
    const context = options.getWakeContext();
    await service.reconcileWake({ ...context, now: Date.now(), source: 'geofence' });
  });
  const gyms = new GymRegionAdapter(location, (regionId) =>
    service.invalidateGymRegion(regionId, Date.now(), detectionStore.getState().data.generation),
  );
  return {
    service,
    awake,
    steps,
    motion,
    motionProvider: rawMotion,
    placement,
    placementProvider: rawPlacement,
    location,
    gymLog,
    gyms,
    historyLedger,
    walkingDurationLedger,
    walkingDurationTotals: async () => (await walkingDurationLedger.read()).millisecondsByDay,
    registerGyms: gyms.registerSavedGyms.bind(gyms),
    deleteGym: (regionId: string) => gyms.deleteSavedGym(regionId),
    start: (graceMs: number) => service.start(graceMs),
    stop: async () => {
      unregisterHeadless();
      await service.stop();
      rawMotion.dispose();
      rawPlacement.dispose();
      location.dispose();
    },
    reconcileWake: (wake: DetectionWake) => service.reconcileWake(wake),
    snapshot: () => detectionStore.getState().data,
    startProppedScan: (now: number, generation: number) => service.startProppedScan(now, generation),
    completeProppedScan: (now: number, scanGeneration: number, generation: number) =>
      service.completeProppedScan(now, scanGeneration, generation),
    cancelProppedScan: (now: number, generation: number) => service.cancelProppedScan(now, generation),
  };
}
