import type {
  ClientEventName,
  EmptyProps,
  FlowScreen,
  PropsOf,
} from "@excerlock/analytics-events";
import { isFlowScreen } from "@excerlock/analytics-events";

import { noopSink } from "./noopSink";
import { sanitizeAnalyticsProperties } from "./privacyPolicy";
import type { AnalyticsPayload, AnalyticsSink } from "./sink";
import { SUPER_PROPERTIES } from "./superProperties";

const NO_PROPS: AnalyticsPayload = {};

/**
 * The payload argument of `track()`, derived from the registry: required and
 * exact for every event that declares properties, omittable only for the
 * events whose declared props are empty (`sick_day_override_used`,
 * `diagnostics_shared`, `data_export_requested`, …).
 */
export type TrackArgs<E extends ClientEventName> = PropsOf<E> extends EmptyProps
  ? [props?: EmptyProps]
  : [props: PropsOf<E>];

/**
 * The typed client emitter. `track()` accepts only client-owned events (D4/D5)
 * with their exact registry payloads; server- and Adapty-owned names do not
 * type-check here at all.
 */
export interface AnalyticsKit {
  /** Install the real transport at boot — the Phase-5 seam (see README). */
  installSink(sink: AnalyticsSink): void;
  track<E extends ClientEventName>(event: E, ...props: TrackArgs<E>): void;
  /** Manual `$screen` on real navigation only (D11). */
  trackScreen(screen: FlowScreen): void;
  /** Clerk user id, at post-purchase sign-up only (D6). */
  identify(distinctId: string): void;
  /** Drain identified events before authoritative account erasure. */
  flush(): Promise<void>;
  /** Drop the identity on sign-out so the next session starts anonymous. */
  reset(): void;
}

/**
 * Build a kit over a transport. The default is the no-op sink, so every call
 * site written before Phase 5 is already correct and simply goes nowhere.
 */
export function createAnalyticsKit(initialSink: AnalyticsSink = noopSink): AnalyticsKit {
  let sink = initialSink;
  sink.register(SUPER_PROPERTIES);

  return {
    installSink(next) {
      sink = next;
      sink.register(SUPER_PROPERTIES);
    },
    track(event, ...props) {
      const [payload] = props as [AnalyticsPayload?];
      sink.capture(
        event,
        sanitizeAnalyticsProperties(event, payload ?? NO_PROPS),
      );
    },
    trackScreen(screen) {
      if (!isFlowScreen(screen)) {
        return;
      }
      sink.screen(screen, NO_PROPS);
    },
    identify(distinctId) {
      sink.identify(distinctId, NO_PROPS);
    },
    flush() {
      return sink.flush();
    },
    reset() {
      sink.reset();
    },
  };
}
