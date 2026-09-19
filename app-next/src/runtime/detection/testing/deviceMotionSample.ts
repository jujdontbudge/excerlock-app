import type { DeviceMotionSample } from '../../../../modules/excerlock-motion/src/ExcerlockMotion.types';

/** A native device-motion sample with the fields the placement/stride tests do not read filled in honestly. */
export function nativeDeviceMotionSample(
  overrides: Partial<DeviceMotionSample> & Pick<DeviceMotionSample, 'timestampMs'>,
): DeviceMotionSample {
  return {
    gravity: { x: 0, y: 0, z: -1 },
    rotationRate: { x: 0, y: 0, z: 0 },
    userAcceleration: { x: 0, y: 0, z: 0 },
    attitude: { roll: 0, pitch: 0, yaw: 0 },
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    heading: null,
    magneticField: { x: 0, y: 0, z: 0, accuracy: 'uncalibrated' },
    ...overrides,
  };
}
