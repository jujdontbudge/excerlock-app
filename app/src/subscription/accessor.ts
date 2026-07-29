import { MockSubscriptionModule } from "./MockSubscriptionModule";
import type { SubscriptionModule } from "./SubscriptionModule";

let subscriptionModule: SubscriptionModule | undefined;

/**
 * The subscription composition root. Phase 5 changes only this constructor to
 * an Adapty adapter; callers continue to depend on the vendor-free interface.
 */
export function getSubscriptionModule(): SubscriptionModule {
  subscriptionModule ??= new MockSubscriptionModule();
  return subscriptionModule;
}
