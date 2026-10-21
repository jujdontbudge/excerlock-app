import type { AuthIdentity } from '../../../ports/AuthPort';
import { createPostHogAnalyticsAdapter, type PostHogClientBoundary } from '../../../telemetry/PostHogAnalyticsAdapter';
import type { FakeContext } from '../FakeContext';

export function paymentAnalyticsLab(ctx: FakeContext, identity: () => AuthIdentity) {
  let distinctId = 'lab-posthog-device';
  let optedIn = false;
  const client: PostHogClientBoundary = {
    ready: async () => undefined,
    getDeviceId: () => 'lab-posthog-device',
    getDistinctId: () => distinctId,
    register: () => undefined,
    identify: (id) => { distinctId = id; },
    reset: () => { distinctId = 'lab-posthog-device'; },
    optIn: async () => { optedIn = true; },
    optOut: async () => { optedIn = false; },
    clearPendingQueues: () => undefined,
    setPersonProperties: () => undefined,
    capture: (event, props) => {
      if (!optedIn) throw new Error('PostHog lab captured without consent');
      ctx.log('lab_posthog_capture', { event });
      ctx.log(event, props);
    },
    screen: () => undefined,
    onFeatureFlags: () => () => undefined,
    getFeatureFlag: () => undefined,
    getFeatureFlagResult: () => undefined,
  };
  return createPostHogAnalyticsAdapter({
    client,
    getIdentity: identity,
    analyticsEnabled: () => true,
    getContext: () => ({ environment: 'demo', runtime_version: 'lab', update_id: 'lab', walk_places: 'none' }),
  });
}
