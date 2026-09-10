const mockInstances: any[] = [];
jest.mock('posthog-react-native', () => {
  class MockPostHog {
    apiKey: string; options: Record<string, unknown>;
    persisted: [string, unknown][] = []; shutdown = jest.fn(async () => undefined);
    constructor(...mockArgs: [string, Record<string, unknown>]) { this.apiKey = mockArgs[0]; this.options = mockArgs[1]; mockInstances.push(this); }
    ready = async () => undefined; getDeviceId = () => 'device'; getDistinctId = () => 'distinct';
    register = jest.fn(); identify = jest.fn(); reset = jest.fn(); optIn = async () => undefined; optOut = async () => undefined;
    capture = jest.fn(); screen = jest.fn(); onFeatureFlags = () => () => undefined; getFeatureFlag = () => undefined;
    setPersonProperties = jest.fn(); setPersistedProperty = (key: string, value: unknown) => { this.persisted.push([key, value]); };
    flushStorage = jest.fn(async () => undefined);
  }
  return { __esModule: true, default: MockPostHog, PostHogPersistedProperty: { Queue: 'queue', AiQueue: 'ai_queue', LogsQueue: 'logs_queue' } };
});

import { bindPostHogClient, createPostHogRuntime } from '../createPostHogRuntime';

const dependencies = {
  getIdentity: () => ({ userId: 'uid', generation: 1, ready: true }), analyticsEnabled: () => true,
  getContext: () => ({ environment: 'preview', runtime_version: '1', update_id: 'embedded', walk_places: 'none' as const }),
};

test('boundary clears all real SDK queue properties and persists without upload', async () => {
  const runtime = createPostHogRuntime({ apiKey: 'ph_test' }, dependencies); const client = mockInstances.at(-1);
  const boundary = bindPostHogClient(client); await boundary.clearPendingQueues();
  expect(client.persisted).toEqual([['queue', []], ['ai_queue', []], ['logs_queue', []]]);
  expect(client.flushStorage).toHaveBeenCalledTimes(1); expect(client.capture).not.toHaveBeenCalled();
  boundary.setPersonProperties({ walk_places: 'outside' }, false);
  expect(client.setPersonProperties).toHaveBeenCalledWith({ walk_places: 'outside' }, undefined, false);
  await runtime.dispose();
});

test('factory enforces one client until idempotent disposal and applies privacy options', async () => {
  const first = createPostHogRuntime({ apiKey: 'ph_one', host: 'https://example.test' }, dependencies);
  expect(() => createPostHogRuntime({ apiKey: 'ph_two' }, dependencies)).toThrow('already exists');
  const client = mockInstances.at(-1);
  expect(client.options).toEqual(expect.objectContaining({ defaultOptIn: false, preloadFeatureFlags: false, disableGeoip: true, captureAppLifecycleEvents: false, errorTracking: { autocapture: false } }));
  await first.dispose(); await first.dispose(); expect(client.shutdown).toHaveBeenCalledTimes(1);
  const second = createPostHogRuntime({ apiKey: 'ph_two' }, dependencies); await second.dispose();
});
