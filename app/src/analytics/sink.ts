import type { PropValue } from "@excerlock/analytics-events";

/**
 * D12 — a flat bag of ids, enums, numbers and booleans. Never free text, never a
 * health value. The registry's `PropsOf<E>` types are all assignable to this.
 */
export type AnalyticsPayload = Readonly<Record<string, PropValue | undefined>>;

/** One thing the kit hands the transport, captured in emission order. */
export type AnalyticsSignal =
  | { kind: "register"; props: AnalyticsPayload }
  | { kind: "capture"; event: string; props: AnalyticsPayload }
  | { kind: "screen"; screen: string; props: AnalyticsPayload }
  | { kind: "identify"; distinctId: string; props: AnalyticsPayload }
  | { kind: "reset" };

/**
 * The transport seam. Deliberately vendor-shaped but vendor-free: the five
 * methods mirror the PostHog client one-for-one so the Phase-5 adapter is a
 * thin forward, and nothing above this line knows a vendor exists.
 *
 * Event names arrive here as plain strings — this is the one place in `app/`
 * where an event name is dynamic, which is exactly what the single-emitter
 * guardrail allowlists for `app/src/analytics/`. Typing happens above, in
 * `AnalyticsKit.track()`.
 */
export interface AnalyticsSink {
  /** Super properties stamped onto every later event (D2). */
  register(props: AnalyticsPayload): void;
  capture(event: string, props: AnalyticsPayload): void;
  /** Manual screen tracking only — autocapture stays off (D11). */
  screen(screen: string, props: AnalyticsPayload): void;
  /** Distinct id passthrough — the Clerk user id, at post-purchase sign-up (D6). */
  identify(distinctId: string, props: AnalyticsPayload): void;
  /** Resolve only after pending events have reached the transport boundary. */
  flush(): Promise<void>;
  reset(): void;
}
