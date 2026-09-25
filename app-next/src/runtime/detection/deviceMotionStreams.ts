import type { DeviceMotionSample as NativeDeviceMotionSample } from '../../../modules/excerlock-motion/src/ExcerlockMotion.types';
import type {
  DeviceMotionSample,
  PhonePlacementProvider,
  PhonePlacementSubscription,
} from '../../engine/signals/placement/PhonePlacementProvider';
import type { StrideMotionSample, StrideMotionSource } from './StrideRhythm';

export const PLACEMENT_SAMPLE_INTERVAL_MS = 100;
const DECIMATION_TOLERANCE_MS = 10;

export function decimateDeviceMotion(
  provider: PhonePlacementProvider,
  intervalMs = PLACEMENT_SAMPLE_INTERVAL_MS,
): PhonePlacementProvider {
  return {
    start: () => provider.start(),
    stop: () => provider.stop(),
    onSample(callback: (sample: DeviceMotionSample) => void): PhonePlacementSubscription {
      let lastForwardedAt: number | null = null;
      return provider.onSample((sample) => {
        if (lastForwardedAt !== null && sample.timestampMs - lastForwardedAt < intervalMs - DECIMATION_TOLERANCE_MS) return;
        lastForwardedAt = sample.timestampMs;
        callback(sample);
      });
    },
  };
}

export function strideSourceFrom(provider: {
  onSample(callback: (sample: NativeDeviceMotionSample) => void): PhonePlacementSubscription;
}): StrideMotionSource {
  return {
    onSample: (callback: (sample: StrideMotionSample) => void) =>
      provider.onSample((sample) => {
        callback({
          t: sample.timestampMs,
          gravity: sample.gravity,
          rotationRate: sample.rotationRate,
          userAcceleration: sample.userAcceleration,
        });
      }),
  };
}
