import type { RegionTransition } from '../../../engine/signals/location/LocationProvider';
import {
  reconcilePersistedGeofenceEvent,
  registerHeadlessDetectionBootstrap,
  registerHeadlessDetectionHandler,
} from '../headlessRegistry';

const event = (regionId: string): RegionTransition => ({ type: 'enter', regionId, atMs: 1 });
const cleanups: (() => void)[] = [];
afterEach(() => { cleanups.splice(0).reverse().forEach((cleanup) => cleanup()); });

test('throws instead of silently dropping a cold event when no bootstrap exists', async () => {
  await expect(reconcilePersistedGeofenceEvent(event('missing'))).rejects.toThrow('bootstrap is unavailable');
});

test('concurrent cold events share one initialization then each reach the installed handler', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const handled = jest.fn(async (_transition: RegionTransition) => {});
  const initialize = jest.fn(async () => {
    await gate;
    cleanups.push(registerHeadlessDetectionHandler(handled));
  });
  cleanups.push(registerHeadlessDetectionBootstrap(initialize));
  const first = reconcilePersistedGeofenceEvent(event('one'));
  const second = reconcilePersistedGeofenceEvent(event('two'));
  await Promise.resolve();
  expect(initialize).toHaveBeenCalledTimes(1);
  release();
  await Promise.all([first, second]);
  expect(handled.mock.calls.map(([transition]) => transition.regionId).sort()).toEqual(['one', 'two']);
});

test('failed initialization is explicit and a later event retries', async () => {
  const handled = jest.fn(async (_transition: RegionTransition) => {});
  const initialize = jest.fn()
    .mockRejectedValueOnce(new Error('boot failed'))
    .mockImplementationOnce(async () => { cleanups.push(registerHeadlessDetectionHandler(handled)); });
  cleanups.push(registerHeadlessDetectionBootstrap(initialize));
  await expect(reconcilePersistedGeofenceEvent(event('first'))).rejects.toThrow('boot failed');
  await expect(reconcilePersistedGeofenceEvent(event('retry'))).resolves.toBeUndefined();
  expect(initialize).toHaveBeenCalledTimes(2);
  expect(handled).toHaveBeenCalledWith(event('retry'));
});

test('successful initializer without a handler fails and is retryable', async () => {
  const initialize = jest.fn(async () => {});
  cleanups.push(registerHeadlessDetectionBootstrap(initialize));
  await expect(reconcilePersistedGeofenceEvent(event('one'))).rejects.toThrow('without registering a handler');
  await expect(reconcilePersistedGeofenceEvent(event('two'))).rejects.toThrow('without registering a handler');
  expect(initialize).toHaveBeenCalledTimes(2);
});

test('stale disposers cannot clear newer handler or bootstrap generations', async () => {
  const oldHandler = jest.fn(async (_transition: RegionTransition) => {});
  const newHandler = jest.fn(async (_transition: RegionTransition) => {});
  const disposeOldHandler = registerHeadlessDetectionHandler(oldHandler);
  cleanups.push(registerHeadlessDetectionHandler(newHandler));
  disposeOldHandler();
  await reconcilePersistedGeofenceEvent(event('handler'));
  expect(newHandler).toHaveBeenCalledTimes(1);

  cleanups.pop()?.();
  const disposeOldBootstrap = registerHeadlessDetectionBootstrap(async () => { throw new Error('old'); });
  const initializeNew = jest.fn(async () => { cleanups.push(registerHeadlessDetectionHandler(newHandler)); });
  cleanups.push(registerHeadlessDetectionBootstrap(initializeNew));
  disposeOldBootstrap();
  await reconcilePersistedGeofenceEvent(event('bootstrap'));
  expect(initializeNew).toHaveBeenCalledTimes(1);
});
