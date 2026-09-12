import {
  createPostHogAnalyticsAdapter,
  type AnalyticsContext,
  type CanonicalIdentity,
  type PostHogClientBoundary,
} from '../../runtime/analytics/PostHogAnalyticsAdapter';

export type PostHogRuntimeConfig = { apiKey: string; host?: string };

const client: PostHogClientBoundary = {
  async ready() {},
  getDeviceId: () => 'linked-trace-local-device',
  getDistinctId: () => 'linked-trace-local-person',
  register() {},
  identify() {},
  reset() {},
  async optIn() {},
  async optOut() {},
  async clearPendingQueues() {},
  setPersonProperties() {},
  capture() {},
  screen() {},
  onFeatureFlags: () => () => {},
  getFeatureFlag: () => undefined,
};

export function createPostHogRuntime(
  _config: PostHogRuntimeConfig,
  dependencies: {
    getIdentity: () => CanonicalIdentity;
    analyticsEnabled: () => boolean;
    getContext: () => AnalyticsContext;
  },
) {
  const analytics = createPostHogAnalyticsAdapter({ client, ...dependencies, analyticsEnabled: () => false });
  return {
    analytics,
    getDistinctId: client.getDistinctId,
    async dispose() {},
  };
}
