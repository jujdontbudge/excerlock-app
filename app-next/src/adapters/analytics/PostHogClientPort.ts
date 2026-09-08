import { PropValue } from '@excerlock/analytics-events';

/** A property bag that has already crossed the privacy boundary. */
export type SafeProperties = Readonly<Record<string, PropValue>>;

/**
 * The slice of `posthog-react-native` this adapter uses, named so the adapter can be tested
 * without the SDK. A `PostHog` instance satisfies it structurally; nothing else under `src/`
 * imports the vendor package.
 */
export interface PostHogClientPort {
  /** Super properties stamped onto every later event (D2). */
  register(properties: SafeProperties): unknown;
  capture(event: string, properties: SafeProperties): unknown;
  /** Manual screen tracking only — autocapture stays off (D11). */
  screen(name: string, properties: SafeProperties): unknown;
  identify(distinctId: string, properties?: SafeProperties): unknown;
  /** `$set` on the current person, with no accompanying product event. */
  setPersonProperties(properties: SafeProperties): unknown;
  optIn(): unknown;
  optOut(): unknown;
  reset(): unknown;
  flush(): Promise<void>;
}
