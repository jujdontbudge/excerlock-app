import type { AnalyticsPayload, AnalyticsSignal, AnalyticsSink } from "./sink";

/** One captured event, the shape assertions actually care about. */
export type RecordedEvent = { event: string; props: AnalyticsPayload };

export interface RecordingSink extends AnalyticsSink {
  /** Every signal received, oldest first, capped at the buffer limit. */
  readonly signals: readonly AnalyticsSignal[];
  /** Just the captured events — register/screen/identify/reset noise removed. */
  captured(): RecordedEvent[];
  /** Just the captured event names, for order assertions. */
  eventNames(): string[];
  clear(): void;
}

/** Enough to hold a whole onboarding funnel plus a session's worth of earns. */
const DEFAULT_LIMIT = 200;

/**
 * The in-memory transport: a bounded ring buffer. Tests assert against it, and
 * the §3.15 debug menu reads the same buffer to show the live event stream.
 */
export function createRecordingSink(limit: number = DEFAULT_LIMIT): RecordingSink {
  const signals: AnalyticsSignal[] = [];

  function record(signal: AnalyticsSignal): void {
    signals.push(signal);
    if (signals.length > limit) {
      signals.splice(0, signals.length - limit);
    }
  }

  return {
    signals,
    register: (props) => record({ kind: "register", props }),
    capture: (event, props) => record({ kind: "capture", event, props }),
    screen: (screen, props) => record({ kind: "screen", screen, props }),
    identify: (distinctId, props) => record({ kind: "identify", distinctId, props }),
    flush: async () => undefined,
    reset: () => record({ kind: "reset" }),
    captured: () =>
      signals.flatMap((signal) =>
        signal.kind === "capture" ? [{ event: signal.event, props: signal.props }] : [],
      ),
    eventNames: () =>
      signals.flatMap((signal) => (signal.kind === "capture" ? [signal.event] : [])),
    clear: () => {
      signals.length = 0;
    },
  };
}
