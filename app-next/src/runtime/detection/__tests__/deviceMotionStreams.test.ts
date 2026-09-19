import type { DeviceMotionSample as NativeDeviceMotionSample } from '../../../../modules/excerlock-motion/src/ExcerlockMotion.types';
import type { DeviceMotionSample, PhonePlacementProvider } from '../../../engine/signals/placement/PhonePlacementProvider';
import { PLACEMENT_SAMPLE_INTERVAL_MS, decimateDeviceMotion, strideSourceFrom } from '../deviceMotionStreams';
import { nativeDeviceMotionSample } from '../testing/deviceMotionSample';

function fakeProvider() {
  const listeners = new Set<(sample: NativeDeviceMotionSample) => void>();
  const start = jest.fn(async () => {});
  const stop = jest.fn(async () => {});
  const provider = {
    start, stop,
    onSample: (callback: (sample: NativeDeviceMotionSample) => void) => { listeners.add(callback); return () => listeners.delete(callback); },
  };
  const emit = (timestampMs: number) => {
    const sample: NativeDeviceMotionSample = nativeDeviceMotionSample({
      timestampMs,
      gravity: { x: 0, y: 0, z: -1 },
      rotationRate: { x: 0.1, y: 0, z: 0 },
      userAcceleration: { x: 0, y: 0.02, z: 0 },
    });
    listeners.forEach((listener) => listener(sample));
  };
  return { provider, emit, start, stop, listeners };
}

test('the placement stream keeps one sample per 100 ms out of the 50 Hz stream, tolerating receipt jitter', async () => {
  const fake = fakeProvider();
  const decimated = decimateDeviceMotion(fake.provider as unknown as PhonePlacementProvider);
  const received: DeviceMotionSample[] = [];
  const unsubscribe = decimated.onSample((sample) => received.push(sample));
  for (let t = 0; t < 1000; t += 20) fake.emit(t + (t % 40 === 0 ? 3 : -4));
  expect(received.map((sample) => sample.timestampMs)).toEqual([3, 96, 203, 296, 403, 496, 603, 696, 803, 896]);
  await decimated.start();
  await decimated.stop();
  expect(fake.start).toHaveBeenCalledTimes(1);
  expect(fake.stop).toHaveBeenCalledTimes(1);
  unsubscribe();
  expect(fake.listeners.size).toBe(0);
});

test('a slower stream passes through untouched and each subscription decimates independently', () => {
  const fake = fakeProvider();
  const decimated = decimateDeviceMotion(fake.provider as unknown as PhonePlacementProvider);
  const first: number[] = [];
  const second: number[] = [];
  decimated.onSample((sample) => first.push(sample.timestampMs));
  for (let t = 0; t < 500; t += PLACEMENT_SAMPLE_INTERVAL_MS) fake.emit(t);
  decimated.onSample((sample) => second.push(sample.timestampMs));
  fake.emit(500);
  expect(first).toEqual([0, 100, 200, 300, 400, 500]);
  expect(second).toEqual([500]);
});

test('the stride source maps native samples to analyzer samples at full rate', () => {
  const fake = fakeProvider();
  const source = strideSourceFrom(fake.provider);
  const received: { t: number }[] = [];
  const unsubscribe = source.onSample((sample) => received.push(sample));
  fake.emit(20);
  fake.emit(40);
  expect(received).toEqual([
    { t: 20, gravity: { x: 0, y: 0, z: -1 }, rotationRate: { x: 0.1, y: 0, z: 0 }, userAcceleration: { x: 0, y: 0.02, z: 0 } },
    { t: 40, gravity: { x: 0, y: 0, z: -1 }, rotationRate: { x: 0.1, y: 0, z: 0 }, userAcceleration: { x: 0, y: 0.02, z: 0 } },
  ]);
  unsubscribe();
  expect(fake.listeners.size).toBe(0);
});
