import type { DeviceMotionSample as NativeDeviceMotionSample } from '../../../modules/excerlock-motion/src/ExcerlockMotion.types';
import type {
  DeviceMotionSample,
  PhonePlacementProvider,
  PhonePlacementSubscription,
} from '../../engine/signals/placement/PhonePlacementProvider';
import type { StrideMotionSample, StrideMotionSource } from './StrideRhythm';

/**
 * The placement classifier's per-sample delta thresholds were calibrated on
 * the 10 Hz stream (#128). The native stream now runs at 50 Hz for the stride
 * discriminator, so placement keeps seeing one sample per 100 ms.
 */
export const PLACEMENT_SAMPLE_INTERVAL_MS = 100;
/** Half a 50 Hz period: receipt-clock jitter must not turn one 100 ms gap into 120 ms. */
const DECIMATION_TOLERANCE_MS = 10;

/** Forwards every `intervalMs` of a faster device-motion stream; start/stop pass through. */
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

/** Exposes the native 50 Hz device-motion stream to the stride discriminator. */
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
