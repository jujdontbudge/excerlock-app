import type { ClientEventName } from "@excerlock/analytics-events";

/**
 * These events are useful as occurrence counters, but every detail describing
 * the underlying earn is local-only under the App Store privacy commitment.
 */
const PROPERTY_FREE_EVENTS = new Set<ClientEventName>(["earn_claimed"]);

export function mayTransmitAnalyticsProperties(event: ClientEventName): boolean {
  return !PROPERTY_FREE_EVENTS.has(event);
}
