import PostHog, { PostHogPersistedProperty, type PostHogOptions } from 'posthog-react-native';
import {
  POSTHOG_OPTIONS,
  createPostHogAnalyticsAdapter,
  type AnalyticsContext,
  type CanonicalIdentity,
  type PostHogClientBoundary,
} from './PostHogAnalyticsAdapter';

class PersistablePostHog extends PostHog {
  persistStorage(): Promise<void> { return this.flushStorage(); }
}

type SdkClient = Pick<PersistablePostHog,
  'ready' | 'getDeviceId' | 'getDistinctId' | 'register' | 'identify' | 'reset' |
  'optIn' | 'optOut' | 'capture' | 'screen' | 'onFeatureFlags' | 'getFeatureFlag' |
  'getFeatureFlagResult' |
  'setPersonProperties' | 'setPersistedProperty' | 'persistStorage' | 'shutdown'>;

export function bindPostHogClient(client: SdkClient): PostHogClientBoundary {
  return {
    ready: () => client.ready(),
    getDeviceId: () => client.getDeviceId(),
    getDistinctId: () => client.getDistinctId(),
    register: (properties) => client.register(properties),
    identify: (id) => client.identify(id),
    reset: () => client.reset(),
    optIn: () => client.optIn(),
    optOut: () => client.optOut(),
    async clearPendingQueues() {
      // reset() intentionally preserves these queues in RN 4.61.2. These are
      // public persisted properties; flushStorage persists without uploading.
      client.setPersistedProperty(PostHogPersistedProperty.Queue, []);
      client.setPersistedProperty(PostHogPersistedProperty.AiQueue, []);
      client.setPersistedProperty(PostHogPersistedProperty.LogsQueue, []);
      await client.persistStorage();
    },
    setPersonProperties: (properties, reloadFeatureFlags) => client.setPersonProperties(properties, undefined, reloadFeatureFlags),
    capture: (event, properties) => client.capture(event, properties),
    screen: (name, properties) => client.screen(name, properties),
    onFeatureFlags: (callback) => client.onFeatureFlags(callback),
    getFeatureFlag: (key, options) => client.getFeatureFlag(key, options),
    // The SDK's single-evaluation payload read; unused options stay forwarded
    // so the adapter controls `sendEvent` (always false for configuration flags).
    getFeatureFlagResult: (key, options) => client.getFeatureFlagResult(key, options),
  };
}

export type PostHogRuntimeConfig = { apiKey: string; host?: string };
let activeClient: PersistablePostHog | null = null;

export function createPostHogRuntime(config: PostHogRuntimeConfig, dependencies: {
  getIdentity: () => CanonicalIdentity;
  analyticsEnabled: () => boolean;
  getContext: () => AnalyticsContext;
}) {
  if (!config.apiKey.trim()) throw new Error('PostHog API key is required');
  if (activeClient) throw new Error('PostHog runtime already exists');
  const sdkOptions: PostHogOptions = { ...POSTHOG_OPTIONS, host: config.host };
  const client = new PersistablePostHog(config.apiKey, sdkOptions);
  activeClient = client;
  const boundary = bindPostHogClient(client);
  const analytics = createPostHogAnalyticsAdapter({ client: boundary, ...dependencies });
  let disposed = false;
  return {
    analytics,
    getDistinctId: () => boundary.getDistinctId(),
    async dispose() {
      if (disposed) return;
      disposed = true;
      try { await client.shutdown(); }
      finally { if (activeClient === client) activeClient = null; }
    },
  };
}
