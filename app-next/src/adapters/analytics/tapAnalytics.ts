import type { AnalyticsPort } from '../../ports/AnalyticsPort';

/** What a tap sees for each call on the wrapped port. `props` is absent for `screen` and `identify`. */
export type AnalyticsTap = (
  kind: 'track' | 'screen' | 'identify',
  name: string,
  props?: Record<string, unknown>,
) => void;

/**
 * Wraps an `AnalyticsPort` so every `track`, `screen` and `identify` is reported to `tap` before it is
 * forwarded unchanged. This is the one place outside the PostHog adapter that forwards a dynamic event
 * name, which keeps the single-emitter guardrail honest: mirrors (the diagnostics log, the developer
 * log) decorate here instead of re-implementing the port.
 */
export function tapAnalytics(analytics: AnalyticsPort, tap: AnalyticsTap): AnalyticsPort {
  return {
    track: (event, props) => {
      tap('track', event, props);
      analytics.track(event, props);
    },
    screen: (name) => {
      tap('screen', name);
      analytics.screen(name);
    },
    identify: (id) => {
      tap('identify', id);
      analytics.identify(id);
    },
    setPersonProperties: (props) => analytics.setPersonProperties(props),
    reset: () => analytics.reset(),
  };
}
