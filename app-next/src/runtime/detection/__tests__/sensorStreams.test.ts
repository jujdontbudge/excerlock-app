import { SENSOR_STREAMS, runSensorStreamSmoke, snapshotSensors, type SensorStreamModuleClient } from '../sensorStreams';
import { EVERYTHING_AVAILABLE, EVERYTHING_UNAVAILABLE, FakeSensorStreamModule } from '../testing/FakeSensorStreamModule';

const immediate = async () => {};

test('the catalogue names every native stream once, with the flags its Swift guard checks', () => {
  expect(SENSOR_STREAMS.map((stream) => stream.id)).toEqual([
    'activityCadence', 'deviceMotion', 'altimeter', 'magnetometer', 'pedometerEvents',
  ]);
  expect(SENSOR_STREAMS.find((stream) => stream.id === 'activityCadence')?.availability)
    .toEqual(['activity', 'cadence', 'stepCounting']);
  expect(SENSOR_STREAMS.find((stream) => stream.id === 'altimeter')?.availability).toEqual(['relativeAltitude']);
  // CMMotionActivityManager, CMPedometer and CMAltimeter sit behind Motion & Fitness
  // (each has a CMAuthorizationStatus); CMMotionManager streams never prompt.
  expect(SENSOR_STREAMS.filter((stream) => stream.requiresMotionAuthorization).map((stream) => stream.id))
    .toEqual(['activityCadence', 'altimeter', 'pedometerEvents']);
});

test('on a device without sensors every stream rejects with ERR_MOTION_UNAVAILABLE, stop still resolves, and the report is consistent', async () => {
  const native = new FakeSensorStreamModule(EVERYTHING_UNAVAILABLE);
  const report = await runSensorStreamSmoke(native, { sampleWindowMs: 0, wait: immediate });
  expect(report.ok).toBe(true);
  expect(report.availability).toEqual(EVERYTHING_UNAVAILABLE);
  expect(report.streams).toHaveLength(SENSOR_STREAMS.length);
  for (const stream of report.streams) {
    expect(stream).toMatchObject({
      available: false,
      start: { outcome: 'rejected', code: 'ERR_MOTION_UNAVAILABLE' },
      stop: { outcome: 'stopped', code: null },
      samples: 0,
      ok: true,
    });
  }
  expect(report.recorder).toEqual({ available: false, outcome: 'rejected', code: 'ERR_MOTION_UNAVAILABLE', ok: true });
  // Every stream was asked to start and then stopped, in catalogue order.
  expect(native.calls.filter((call) => call.startsWith('start:'))).toEqual(
    SENSOR_STREAMS.map((stream) => `start:${stream.id}`),
  );
  expect(native.running.size).toBe(0);
  for (const stream of SENSOR_STREAMS) expect(native.listenerCount(stream.event)).toBe(0);
});

test('an available stream starts, delivers samples inside the window, and stops', async () => {
  const native = new FakeSensorStreamModule(EVERYTHING_AVAILABLE, 'authorized', 3);
  const report = await runSensorStreamSmoke(native, { sampleWindowMs: 250, wait: immediate });
  expect(report.ok).toBe(true);
  for (const stream of report.streams) {
    expect(stream).toMatchObject({ available: true, start: { outcome: 'started', code: null }, samples: 3, stop: { outcome: 'stopped' }, ok: true });
  }
  expect(report.recorder).toEqual({ available: true, outcome: 'recorded', code: null, ok: true });
  expect(native.calls).toContain('recordAccelerometer:1');
  expect(native.running.size).toBe(0);
});

test('Motion & Fitness streams are skipped, never started, while authorization is undetermined', async () => {
  const native = new FakeSensorStreamModule(EVERYTHING_AVAILABLE, 'notDetermined', 1);
  const report = await runSensorStreamSmoke(native, { sampleWindowMs: 0, wait: immediate });
  const byId = Object.fromEntries(report.streams.map((stream) => [stream.id, stream]));
  expect(byId.activityCadence).toMatchObject({ start: { outcome: 'skipped', code: 'notDetermined' }, ok: true });
  expect(byId.pedometerEvents).toMatchObject({ start: { outcome: 'skipped', code: 'notDetermined' }, ok: true });
  expect(byId.altimeter).toMatchObject({ start: { outcome: 'skipped', code: 'notDetermined' }, ok: true });
  expect(byId.deviceMotion).toMatchObject({ start: { outcome: 'started' }, samples: 1 });
  expect(byId.magnetometer).toMatchObject({ start: { outcome: 'started' }, samples: 1 });
  expect(native.calls).not.toContain('start:activityCadence');
  expect(native.calls).not.toContain('start:altimeter');
  expect(native.calls).not.toContain('start:pedometerEvents');
  // The recorder is Motion & Fitness gated as well.
  expect(report.recorder).toMatchObject({ outcome: 'skipped', code: 'notDetermined', ok: true });
  expect(report.ok).toBe(true);
});

test('an unavailable Motion & Fitness stream is still exercised while undetermined: native rejects before it could prompt', async () => {
  // The simulator's exact state: nothing available, permission never asked. The
  // Swift guards check availability before touching Core Motion, so start() rejects
  // with ERR_MOTION_UNAVAILABLE without raising the Motion & Fitness prompt.
  const native = new FakeSensorStreamModule(EVERYTHING_UNAVAILABLE, 'notDetermined');
  const report = await runSensorStreamSmoke(native, { sampleWindowMs: 0, wait: immediate });
  const byId = Object.fromEntries(report.streams.map((stream) => [stream.id, stream]));
  for (const id of ['activityCadence', 'altimeter', 'pedometerEvents'] as const) {
    expect(byId[id]).toMatchObject({
      available: false, start: { outcome: 'rejected', code: 'ERR_MOTION_UNAVAILABLE' }, stop: { outcome: 'stopped' }, ok: true,
    });
    expect(native.calls).toContain(`start:${id}`);
  }
  expect(report.recorder).toMatchObject({ available: false, outcome: 'rejected', code: 'ERR_MOTION_UNAVAILABLE', ok: true });
  expect(report.streams.filter((stream) => stream.start.outcome === 'skipped')).toEqual([]);
  expect(report.ok).toBe(true);
});

test('an available stream whose start rejects, or an unavailable stream that starts anyway, fails the report', async () => {
  const lying = new FakeSensorStreamModule(EVERYTHING_UNAVAILABLE);
  // Native claims the altimeter is absent but happily starts it: the flag lies.
  lying.startAltimeter = async () => { lying.running.add('altimeter'); };
  const report = await runSensorStreamSmoke(lying, { sampleWindowMs: 0, wait: immediate });
  const altimeter = report.streams.find((stream) => stream.id === 'altimeter');
  expect(altimeter).toMatchObject({ available: false, start: { outcome: 'started' }, ok: false });
  expect(report.ok).toBe(false);

  const broken = new FakeSensorStreamModule(EVERYTHING_AVAILABLE);
  broken.startMagnetometer = async () => { throw Object.assign(new Error('boom'), { code: 'ERR_SOMETHING' }); };
  const second = await runSensorStreamSmoke(broken, { sampleWindowMs: 0, wait: immediate });
  expect(second.streams.find((stream) => stream.id === 'magnetometer')).toMatchObject({
    available: true, start: { outcome: 'rejected', code: 'ERR_SOMETHING' }, ok: false,
  });
  expect(second.ok).toBe(false);
});

test('a stop that rejects is recorded with its code and fails that stream', async () => {
  const native = new FakeSensorStreamModule(EVERYTHING_AVAILABLE);
  native.stopDeviceMotion = async () => { throw Object.assign(new Error('stuck'), { code: 'ERR_STOP' }); };
  const report = await runSensorStreamSmoke(native, { sampleWindowMs: 0, wait: immediate });
  expect(report.streams.find((stream) => stream.id === 'deviceMotion')).toMatchObject({
    stop: { outcome: 'rejected', code: 'ERR_STOP' }, ok: false,
  });
  expect(report.ok).toBe(false);
});

test('the sensor snapshot is the native answer verbatim, and null when the module cannot answer', () => {
  const native = new FakeSensorStreamModule(EVERYTHING_UNAVAILABLE, 'denied');
  // `authorization` is a forbidden diagnostics key server-side; the snapshot uses `motionAccess`.
  expect(snapshotSensors(native)).toEqual({ availability: EVERYTHING_UNAVAILABLE, motionAccess: 'denied' });
  const broken = { getAvailability: () => { throw new Error('no JSI'); } } as unknown as SensorStreamModuleClient;
  expect(snapshotSensors(broken)).toBeNull();
});
