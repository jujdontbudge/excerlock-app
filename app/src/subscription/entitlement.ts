import type { SubscriptionSnapshot } from "./SubscriptionModule";

/** The one predicate every caller uses to gate premium product behavior. */
export function isPremiumEntitled(snapshot: SubscriptionSnapshot): boolean {
  return snapshot.entitlement.status === "active";
}
