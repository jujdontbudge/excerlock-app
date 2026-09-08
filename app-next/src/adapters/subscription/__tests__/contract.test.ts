import type { AdaptyFlow } from 'react-native-adapty';
import { describeSubscriptionPort } from '../../../ports/__tests__/subscriptionContract';
import { AdaptySdk } from '../adaptySdk';
import { createSubscriptionAdapter } from '..';
import { annualProduct, premium, profile } from './profiles';
import { compliantFlow, flush, sdkHarness } from './sdkHarness';

/** The real adapter meets the port contract with `react-native-adapty` replaced by the harness. */
describeSubscriptionPort(async () => {
  let paywallOutcome: 'purchase' | 'cancel' | 'error' = 'purchase';
  let restoreOutcome: 'purchase' | 'nothing' = 'purchase';
  const harness = sdkHarness({
    flow: async () => (paywallOutcome === 'error' ? Promise.reject(new Error('paywall unavailable')) : compliantFlow()),
    restore: async () =>
      restoreOutcome === 'purchase' ? premium({ expiresAt: new Date('2027-01-01T00:00:00.000Z') }) : profile(),
  });
  const sdk: AdaptySdk = {
    ...harness.sdk,
    // The Builder answers with an event once it is on screen; the harness plays the arranged one.
    createFlowView: async (flow: AdaptyFlow, customTags: Record<string, string>) => {
      const view = await harness.sdk.createFlowView(flow, customTags);
      const events = harness.view();
      return {
        ...view,
        present: async () => {
          await view.present();
          queueMicrotask(() =>
            paywallOutcome === 'purchase'
              ? events.fire(
                  'onPurchaseCompleted',
                  { type: 'success', profile: premium({ activeIntroductoryOfferType: 'free_trial' }) },
                  annualProduct(),
                )
              : events.fire('onDisappeared'),
          );
        },
      };
    },
  };
  const subscription = createSubscriptionAdapter({ apiKey: 'public_live_key', sdk });
  await subscription.resolved;
  await flush();
  return {
    port: subscription,
    paywall: (outcome) => {
      paywallOutcome = outcome;
    },
    restoreFinds: (outcome) => {
      restoreOutcome = outcome;
    },
    identifiedIds: () =>
      harness.order.filter((entry) => entry.startsWith('identify:')).map((entry) => entry.slice('identify:'.length)),
    dispose: () => subscription.dispose(),
  };
});
