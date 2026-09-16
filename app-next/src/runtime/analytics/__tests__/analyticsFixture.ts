import {
  createPostHogAnalyticsAdapter,
  type CanonicalIdentity,
  type PostHogClientBoundary,
} from '../PostHogAnalyticsAdapter';

export type ScreenCall = { name: string; props?: Record<string, string | number | boolean> };

/** Shared PostHog adapter fixture: records transport calls, captures and screen emissions. */
export function createAnalyticsFixture() {
  const calls: string[] = [];
  const captures: { event: string; props?: Record<string, unknown> }[] = [];
  const screens: ScreenCall[] = [];
  let flag: string | boolean | undefined;
  let payload: unknown;
  const listeners = new Set<() => void>();
  let registerGate: Promise<void> | undefined;
  const client: PostHogClientBoundary = {
    ready: async () => { calls.push('ready'); }, getDeviceId: () => (calls.push('device'), 'device-1'), getDistinctId: () => 'uid',
    register: async () => { calls.push('register'); await registerGate; }, identify: () => { calls.push('identify'); }, reset: () => { calls.push('reset'); },
    clearPendingQueues: async () => { calls.push('clear'); },
    setPersonProperties: async (props, reload) => { calls.push(`person:${String(props.walk_places)}:${String(reload)}`); },
    optIn: async () => { calls.push('optIn'); }, optOut: async () => { calls.push('optOut'); }, capture: (e, props) => { calls.push(`capture:${e}`); captures.push({ event: e, props }); },
    screen: (name, props) => { calls.push(`screen:${name}`); screens.push({ name, props }); },
    onFeatureFlags: (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, getFeatureFlag: (_k, o) => { if (o?.sendEvent) calls.push('exposure'); return flag; },
    getFeatureFlagResult: (_k, o) => { if (o?.sendEvent) calls.push('exposure'); return payload === undefined ? undefined : { payload }; },
  };
  let identity: CanonicalIdentity = { userId: 'uid', generation: 1, ready: true };
  let enabled = true;
  const adapter = createPostHogAnalyticsAdapter({ client, getIdentity: () => identity, analyticsEnabled: () => enabled, getContext: () => ({ environment: 'preview', runtime_version: '1', update_id: 'embedded', walk_places: 'outside' }) });
  return {
    adapter, calls, captures, screens,
    setFlag(v: typeof flag) { flag = v; [...listeners].forEach((cb) => cb()); },
    setPayload(v: unknown) { payload = v; },
    setIdentity(v: CanonicalIdentity) { identity = v; },
    disable() { enabled = false; },
    enable() { enabled = true; },
    deferRegisters() { let release!: () => void; registerGate = new Promise<void>((resolve) => { release = resolve; }); return release; },
  };
}

/** Lets queued adapter work (register + capture/screen) settle. */
export const flushAdapter = () => new Promise((resolve) => setTimeout(resolve, 0));
