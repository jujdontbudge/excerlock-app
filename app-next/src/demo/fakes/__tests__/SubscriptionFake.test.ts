import { describeSubscriptionPort } from '../../../ports/__tests__/subscriptionContract';
import { createRuntime } from '../../../runtime/createRuntime';

/** The fake obeys the same laws as the Adapty adapter, so Phase 1 screens cannot drift from Phase 2. */
describeSubscriptionPort(async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  return {
    port: runtime.subscription,
    paywall: (outcome) =>
      runtime.dev.setOutcome(outcome === 'purchase' ? 'success' : outcome === 'cancel' ? 'cancel' : 'error'),
    restoreFinds: (outcome) => runtime.dev.setRestoreOutcome(outcome === 'purchase' ? 'restored' : 'notFound'),
    identifiedIds: () =>
      runtime.dev
        .snapshot()
        .events.filter((event) => event.event === 'subscription_identify')
        .map((event) => String(event.props.id)),
    dispose: () => runtime.dispose(),
  };
});
