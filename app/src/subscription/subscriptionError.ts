import type { SubscriptionError } from "./SubscriptionModule";

export function subscriptionError(
  code: SubscriptionError["code"],
  message: string,
): SubscriptionError {
  return Object.freeze({ code, message });
}
