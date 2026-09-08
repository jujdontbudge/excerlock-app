import { PostHogClientPort, SafeProperties } from '../PostHogClientPort';

export type ClientSignal =
  | { kind: 'register'; props: SafeProperties }
  | { kind: 'capture'; event: string; props: SafeProperties }
  | { kind: 'screen'; name: string; props: SafeProperties }
  | { kind: 'identify'; distinctId: string }
  | { kind: 'person'; props: SafeProperties }
  | { kind: 'optIn' }
  | { kind: 'optOut' }
  | { kind: 'reset' };

export interface RecordingClient extends PostHogClientPort {
  /** Every call the adapter made, in order — the only way to assert on ordering. */
  readonly signals: ClientSignal[];
  readonly captured: { event: string; props: SafeProperties }[];
  readonly registered: SafeProperties[];
}

/** A PostHog client that records instead of sending. The SDK never runs in a test. */
export function recordingClient(): RecordingClient {
  const signals: ClientSignal[] = [];
  return {
    signals,
    get captured() {
      return signals.flatMap((s) => (s.kind === 'capture' ? [{ event: s.event, props: s.props }] : []));
    },
    get registered() {
      return signals.flatMap((s) => (s.kind === 'register' ? [s.props] : []));
    },
    register: (props) => signals.push({ kind: 'register', props }),
    capture: (event, props) => signals.push({ kind: 'capture', event, props }),
    screen: (name, props) => signals.push({ kind: 'screen', name, props }),
    identify: (distinctId) => signals.push({ kind: 'identify', distinctId }),
    setPersonProperties: (props) => signals.push({ kind: 'person', props }),
    optIn: () => signals.push({ kind: 'optIn' }),
    optOut: () => signals.push({ kind: 'optOut' }),
    reset: () => signals.push({ kind: 'reset' }),
    flush: async () => undefined,
  };
}
