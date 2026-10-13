import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeMotionProvider } from './lib/motion/NativeMotionProvider';
import { createExcerlockMotionModuleClient } from './lib/native/MotionModuleClient';
import { NativePhonePlacementProvider } from './lib/native/NativePhonePlacementProvider';
import { createPhonePlacementModuleClient } from './lib/native/PhonePlacementModuleClient';
import { createNativeLocationProvider } from './lib/location/createNativeLocationProvider';
import { AsyncStorageGymVisitLog } from './AsyncStorageGymVisitLog';
import { detectionStore } from './detectionStore';
import { MotionAdapter } from './lib/detection/MotionAdapter';
import { SHIPPED_STRIDE_GATE_REPORT } from './lib/detection/strideGateConfig';
import { fastWalkingDetection } from './filmingModeStore';
import { PlacementAdapter } from './lib/detection/PlacementAdapter';
import { decimateDeviceMotion, strideSourceFrom } from './lib/detection/deviceMotionStreams';
import { DetectionService, type DetectionWake } from './DetectionService';
import { createResidencyModuleClient } from './lib/native/ResidencyModuleClient';
import { AwakeSession } from './lib/detection/AwakeSession';
import { StepsDetectionAdapter } from './lib/detection/StepsDetectionAdapter';
import { registerHeadlessDetectionHandler } from './headlessRegistry';
import { GymRegionAdapter } from './lib/detection/GymRegionAdapter';
import { HistoryCreditLedger } from './lib/detection/HistoryCreditLedger';
import { WalkingDurationLedger } from './WalkingDurationLedger';
import { runCleanups } from './lib/detection/runCleanups';
import { createSensorStreamModuleClient } from './lib/native/createSensorStreamModuleClient';
export type NativeDetectionFactoryOptions = {
  getWakeContext(): Omit<DetectionWake, 'now' | 'source'>;
  onError?(error: unknown): void;
  registerHeadless?: boolean;
};
export function createNativeDetection(options: NativeDetectionFactoryOptions) {
  const rawMotion = new NativeMotionProvider(createExcerlockMotionModuleClient());
  const rawPlacement = new NativePhonePlacementProvider(createPhonePlacementModuleClient());
  const sensors = createSensorStreamModuleClient();
  const location = createNativeLocationProvider();
  const gymLog = new AsyncStorageGymVisitLog();
  const motion = new MotionAdapter(rawMotion, Date.now, strideSourceFrom(rawPlacement), SHIPPED_STRIDE_GATE_REPORT, fastWalkingDetection);
  const placement = new PlacementAdapter(decimateDeviceMotion(rawPlacement));
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
  const awake = new AwakeSession(location, createResidencyModuleClient());
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
    sensors,
    location,
    gymLog,
    gyms,
    historyLedger,
    walkingDurationLedger,
    walkingDurationTotals: async () => (await walkingDurationLedger.read()).millisecondsByDay,
    registerGyms: gyms.registerSavedGyms.bind(gyms),
    deleteGym: (regionId: string) => gyms.deleteSavedGym(regionId),
    start: (graceMs: number) => service.start(graceMs),
    stop: () => stopNativeDetection({ unregisterHeadless, service, rawMotion, rawPlacement, location }),
    reconcileWake: (wake: DetectionWake) => service.reconcileWake(wake),
    snapshot: () => detectionStore.getState().data,
    startProppedScan: (now: number, generation: number) => service.startProppedScan(now, generation),
    completeProppedScan: (now: number, scanGeneration: number, generation: number) =>
      service.completeProppedScan(now, scanGeneration, generation),
    cancelProppedScan: (now: number, generation: number) => service.cancelProppedScan(now, generation),
  };
}

export function stopNativeDetection(owned: {
  unregisterHeadless(): void;
  service: Pick<DetectionService, 'stop'>;
  rawMotion: Pick<NativeMotionProvider, 'dispose'>;
  rawPlacement: Pick<NativePhonePlacementProvider, 'dispose'>;
  location: { dispose(): void };
}): Promise<void> {
  return runCleanups(
    [
      () => owned.unregisterHeadless(),
      () => owned.service.stop(),
      () => owned.rawMotion.dispose(),
      () => owned.rawPlacement.dispose(),
      () => owned.location.dispose(),
    ],
    'Native detection cleanup failed',
  );
}
