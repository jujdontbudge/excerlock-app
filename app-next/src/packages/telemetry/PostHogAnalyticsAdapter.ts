import type { PaywallExperimentPort, PaywallVariant, PaywallVariantExposure, SignInRequiredPort } from '../ports/ExperimentPorts';
export type { PaywallExperimentPort, PaywallVariant, PaywallVariantExposure, SignInRequiredPort };
import { eventsOwnedBy } from '@excerlock/analytics-events';
import type { AnalyticsPort } from '../ports/AnalyticsPort';

export type CanonicalIdentity = { userId: string | null; generation: number; ready: boolean };
export type WalkPlaces = 'outside' | 'treadmill' | 'outside_and_treadmill' | 'none';
export type AnalyticsContext = { environment: string; runtime_version: string; update_id: string; walk_places: WalkPlaces };
const walkPlacesValues = new Set<WalkPlaces>(['outside', 'treadmill', 'outside_and_treadmill', 'none']);
export function normalizeWalkPlaces(value: unknown): WalkPlaces | null {
  if (typeof value === 'string' && walkPlacesValues.has(value as WalkPlaces)) return value as WalkPlaces;
  if (!Array.isArray(value) || value.some((item) => item !== 'outside' && item !== 'treadmill')) return null;
  return value.includes('outside') && value.includes('treadmill') ? 'outside_and_treadmill'
    : value.includes('outside') ? 'outside' : value.includes('treadmill') ? 'treadmill' : 'none';
}
export interface PostHogClientBoundary {
  ready(): Promise<void>; getDeviceId(): string; getDistinctId(): string;
  register(properties: Record<string, string | number | boolean>): Promise<void> | void;
  identify(id: string): void; reset(): void; optIn(): Promise<void>; optOut(): Promise<void>;
  clearPendingQueues(): Promise<void> | void;
  setPersonProperties(properties: Record<string, string | number | boolean>, reloadFeatureFlags?: boolean): Promise<void> | void;
  capture(event: string, properties?: Record<string, string | number | boolean>): Promise<void> | void;
  screen(name: string, properties?: Record<string, string | number | boolean>): Promise<void> | void;
  onFeatureFlags(callback: () => void): () => void;
  getFeatureFlag(key: string, options?: { sendEvent?: boolean }): boolean | string | undefined;
  getFeatureFlagResult(key: string, options?: { sendEvent?: boolean }): { readonly payload?: unknown } | undefined;
}
export const POSTHOG_OPTIONS = {
  captureAppLifecycleEvents: false, enableSessionReplay: false, preloadFeatureFlags: false,
  disableSurveys: true, disableGeoip: true, defaultOptIn: false,
  capturePushNotificationSubscriptions: false, capturePushNotificationOpened: false,
  setDefaultPersonProperties: false, errorTracking: { autocapture: false },
  personProfiles: 'identified_only',
} as const;
const forbidden = /email|address|latitude|longitude|receipt|token|user_?id|message|error|url/i;
const forbiddenValue = /^[a-z0-9._-]{1,64}$/i;
export function scrubAnalyticsProps(props: Record<string, unknown> = {}): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (forbidden.test(key)) continue;
    if (typeof value === 'boolean' || typeof value === 'number') clean[key] = value;
    else if (typeof value === 'string' && forbiddenValue.test(value)) clean[key] = value;
  }
  return clean;
}
export const CLIENT_EVENT_ALLOWLIST: ReadonlySet<string> = new Set(eventsOwnedBy('client'));

export function createPostHogAnalyticsAdapter(options: {
  client: PostHogClientBoundary; getIdentity: () => CanonicalIdentity;
  analyticsEnabled: () => boolean; getContext: () => AnalyticsContext;
}): AnalyticsPort & { discardPending(): Promise<void>; setWalkPlaces(value: WalkPlaces): void; replayPendingScreens(): void; flags: PostHogFlagsController } {
  const { client } = options;
  let committed: CanonicalIdentity | null = null;
  type Origin = { userId: string; generation: number };
  const register = async () => client.register({ ...options.getContext(), $device_id: client.getDeviceId() });
  const origin = (): Origin | null => {
    const live = options.getIdentity();
    return live.userId ? { userId: live.userId, generation: live.generation } : null;
  };
  const allowed = (started?: Origin | null) => {
    const live = options.getIdentity();
    return options.analyticsEnabled() && live.ready && !!committed && !!started &&
      live.userId === started.userId && live.generation === started.generation &&
      committed.userId === started.userId && committed.generation === started.generation;
  };
  const emit = async (started: Origin, action: () => Promise<void> | void): Promise<boolean> => {
    try {
      if (!allowed(started)) return false;
      await register();
      if (!allowed(started)) return false;
      await action(); return true;
    } catch { return false; }
  };
  const flags = new PostHogFlagsController(
    client,
    options.getIdentity,
    options.analyticsEnabled,
    () => committed,
    (started, properties) => emit(started, () => client.capture('$feature_flag_called', properties)),
  );
  let consentEpoch = 0;
  let shownScreen: string | null = null;
  const pendingScreens: { key: string; spec: SemanticScreen }[] = [];
  const maxPendingScreens = 24;
  const screenKey = (spec: SemanticScreen) => JSON.stringify([spec.name, spec.props ?? null]);
  const rememberScreen = (entry: { key: string; spec: SemanticScreen }) => {
    if (pendingScreens[pendingScreens.length - 1]?.key === entry.key) return;
    pendingScreens.push(entry);
    if (pendingScreens.length > maxPendingScreens) pendingScreens.shift();
  };
  const replayPendingScreens = () => {
    const started = origin();
    if (!started || !allowed(started) || pendingScreens.length === 0) return;
    const queued = pendingScreens.splice(0, pendingScreens.length);
    shownScreen = queued[queued.length - 1]!.key;
    void (async () => {
      for (const entry of queued) {
        if (!allowed(started)) return;
        await emit(started, () => client.screen(entry.spec.name, entry.spec.props));
      }
    })();
  };
  return {
    async setEnabled(enabled) {
      const epoch = ++consentEpoch;
      if (!enabled) pendingScreens.length = 0;
      flags.invalidate();
      await client.optOut();
      await client.clearPendingQueues();
      if (epoch !== consentEpoch || !enabled || !options.analyticsEnabled()) return;
      const started = origin();
      if (!started || !committed || committed.userId !== started.userId || committed.generation !== started.generation) return;
      await client.optIn();
      if (epoch !== consentEpoch || !options.analyticsEnabled()) { await client.optOut(); return; }
      flags.beginGeneration(started.generation);
      replayPendingScreens();
    },
    async identify(id) {
      committed = null;
      flags.invalidate();
      const started = options.getIdentity();
      if (started.userId !== id) throw new Error('Analytics identity is not canonical');
      await client.ready();
      await register();
      const live = options.getIdentity();
      if (live.userId !== id || live.generation !== started.generation) throw new Error('Analytics identity changed during identify');
      if (options.analyticsEnabled()) await client.optIn(); else await client.optOut();
      const beforeIdentify = options.getIdentity();
      if (beforeIdentify.userId !== id || beforeIdentify.generation !== started.generation) throw new Error('Analytics identity changed during identify');
      client.identify(id);
      await register();
      const completed = options.getIdentity();
      if (completed.userId !== id || completed.generation !== started.generation) throw new Error('Analytics identity changed during identify');
      committed = { ...completed };
      flags.beginGeneration(beforeIdentify.generation);
      replayPendingScreens();
    },
    track(event, props) {
      const started = origin();
      if (!allowed(started) || !CLIENT_EVENT_ALLOWLIST.has(event)) return;
      const walkPlaces = event === 'walk_places_updated' ? normalizeWalkPlaces(props?.walk_places) : null;
      if (event === 'walk_places_updated' && walkPlaces === null) return;
      void emit(started!, async () => {
        if (event === 'walk_places_updated') await client.setPersonProperties({ walk_places: walkPlaces as WalkPlaces }, false);
        if (allowed(started)) await client.capture(event, scrubAnalyticsProps(walkPlaces === null ? props : { ...props, walk_places: walkPlaces }));
      });
    },
    screen(name) {
      const spec = semanticScreenName(name);
      if (!spec) return;
      const key = screenKey(spec);
      if (key === shownScreen) return;
      if (!options.analyticsEnabled()) { pendingScreens.length = 0; return; }
      const started = origin();
      if (!allowed(started)) { rememberScreen({ key, spec }); return; }
      shownScreen = key;
      void emit(started!, () => client.screen(spec.name, spec.props));
    },
    replayPendingScreens,
    setWalkPlaces(value) {
      const started = origin(); if (!allowed(started)) return;
      void emit(started!, () => client.setPersonProperties({ walk_places: value }, false));
    },
    async reset() { committed = null; shownScreen = null; pendingScreens.length = 0; flags.invalidate(); await client.optOut(); await client.clearPendingQueues(); client.reset(); await client.ready(); await register(); if (options.analyticsEnabled()) await client.optIn(); },
    async discardPending() { committed = null; pendingScreens.length = 0; flags.invalidate(); await client.optOut(); await client.clearPendingQueues(); },
    flags,
  };
}

export type FlagName = 'paywall_variant' | 'signInRequired' | 'review_preset';
const allowedPayloadFlags = { shield_copy: true, onboarding_variant: true, stride_gate_config: true } as const;
export type PayloadFlagName = keyof typeof allowedPayloadFlags;
const allowedFlags: Record<FlagName, readonly (string | boolean)[]> = { paywall_variant: ['control', 'variant_b'], signInRequired: [false, true], review_preset: [false, true] };
type FlagValue = string | boolean;
type FlagOrigin = { userId: string; generation: number };
type PendingFlag = { promise: Promise<FlagValue>; resolve: (value: FlagValue) => void; off?: () => void; timeout?: ReturnType<typeof globalThis.setTimeout>; origin: FlagOrigin };
type PendingPayload = { promise: Promise<void>; resolve: () => void; off?: () => void; timeout?: ReturnType<typeof globalThis.setTimeout> };
export class PostHogFlagsController {
  private generation = -1;
  private settled = new Map<FlagName, FlagValue>();
  private exposures = new Set<string>();
  private pending = new Map<FlagName, PendingFlag>();
  private settledPayloadFlags = new Set<PayloadFlagName>();
  private pendingPayloadFlags = new Map<PayloadFlagName, PendingPayload>();
  constructor(
    private client: PostHogClientBoundary,
    private identity: () => CanonicalIdentity,
    private optedIn: () => boolean,
    private committed: () => CanonicalIdentity | null,
    private captureExposure: (origin: FlagOrigin, properties: Record<string, string | number | boolean>) => Promise<boolean>,
  ) {}
  private fallback(name: FlagName): FlagValue { return name === 'signInRequired' || name === 'review_preset' ? false : 'control'; }
  private eligible(origin?: FlagOrigin): origin is FlagOrigin {
    const live = this.identity(), committed = this.committed();
    return !!origin && this.optedIn() && live.ready && !!committed &&
      origin.generation === this.generation && live.generation === origin.generation && committed.generation === origin.generation &&
      live.userId === origin.userId && committed.userId === origin.userId;
  }
  beginGeneration(generation: number) { this.invalidate(); this.generation = generation; }
  invalidate() {
    for (const [name, pending] of this.pending) {
      pending.off?.(); if (pending.timeout !== undefined) clearTimeout(pending.timeout);
      pending.resolve(this.fallback(name));
    }
    this.pending.clear(); this.settled.clear(); this.exposures.clear();
    for (const pending of this.pendingPayloadFlags.values()) {
      pending.off?.(); if (pending.timeout !== undefined) clearTimeout(pending.timeout);
      pending.resolve();
    }
    this.pendingPayloadFlags.clear(); this.settledPayloadFlags.clear();
    this.generation = -1;
  }
  async get(name: FlagName, timeoutMs = 2_000): Promise<FlagValue> {
    const live = this.identity();
    const started = live.userId ? { userId: live.userId, generation: live.generation } : undefined;
    if (!this.eligible(started)) return this.fallback(name);
    if (this.settled.has(name)) return this.settled.get(name)!;
    const existing = this.pending.get(name);
    if (existing) return existing.promise;
    let resolve!: (value: FlagValue) => void;
    const promise = new Promise<FlagValue>((done) => { resolve = done; });
    const pending: PendingFlag = { promise, resolve, origin: started };
    this.pending.set(name, pending);
    const finish = (candidate: FlagValue | undefined) => {
      if (this.pending.get(name) !== pending) return;
      pending.off?.(); if (pending.timeout !== undefined) clearTimeout(pending.timeout);
      this.pending.delete(name);
      const accepted = allowedFlags[name].includes(candidate as never) ? candidate! : this.fallback(name);
      if (!this.eligible(started)) { resolve(this.fallback(name)); return; }
      this.settled.set(name, accepted); resolve(accepted);
    };
    const current = this.client.getFeatureFlag(name, { sendEvent: false });
    if (current !== undefined) finish(current);
    else {
      pending.off = this.client.onFeatureFlags(() => finish(this.client.getFeatureFlag(name, { sendEvent: false })));
      if (this.pending.get(name) !== pending) pending.off();
      else pending.timeout = globalThis.setTimeout(() => finish(undefined), timeoutMs);
    }
    return promise;
  }
  async getPayload(name: PayloadFlagName, timeoutMs = 2_000): Promise<unknown> {
    const live = this.identity();
    const started = live.userId ? { userId: live.userId, generation: live.generation } : undefined;
    if (!this.eligible(started)) return undefined;
    const settled = this.client.getFeatureFlagResult(name, { sendEvent: false });
    if (settled !== undefined) return settled.payload;
    if (!this.settledPayloadFlags.has(name)) await this.awaitPayloadSettlement(name, timeoutMs);
    if (!this.eligible(started)) return undefined;
    return this.client.getFeatureFlagResult(name, { sendEvent: false })?.payload;
  }
  private awaitPayloadSettlement(name: PayloadFlagName, timeoutMs: number): Promise<void> {
    const existing = this.pendingPayloadFlags.get(name);
    if (existing) return existing.promise;
    let resolve!: () => void;
    const promise = new Promise<void>((done) => { resolve = done; });
    const pending: PendingPayload = { promise, resolve };
    const finish = () => {
      if (this.pendingPayloadFlags.get(name) !== pending) return;
      pending.off?.(); if (pending.timeout !== undefined) clearTimeout(pending.timeout);
      this.pendingPayloadFlags.delete(name); this.settledPayloadFlags.add(name); resolve();
    };
    this.pendingPayloadFlags.set(name, pending);
    pending.off = this.client.onFeatureFlags(finish);
    if (this.pendingPayloadFlags.get(name) === pending) pending.timeout = globalThis.setTimeout(finish, timeoutMs);
    else pending.off();
    return promise;
  }
  expose(name: FlagName, placement: string) {
    const live = this.identity(); const started = live.userId ? { userId: live.userId, generation: live.generation } : undefined;
    const value = this.settled.get(name); const key = `${this.generation}:${name}:${placement}`;
    if (value === undefined || this.exposures.has(key) || !this.eligible(started)) return;
    this.exposures.add(key);
    void this.captureExposure(started, { $feature_flag: name, $feature_flag_response: value }).then((captured) => {
      if (!captured) this.exposures.delete(key);
    });
  }
  exposePaywall(input: PaywallVariantExposure) {
    if (input.generation !== this.generation || this.settled.get('paywall_variant') !== input.variant) return;
    this.expose('paywall_variant', `${input.placement}:${input.flowVariationId}`);
  }
}

export function createPaywallExperimentPort(flags: PostHogFlagsController): PaywallExperimentPort {
  return {
    async getPaywallVariant() { return await flags.get('paywall_variant') as PaywallVariant; },
    trackPaywallVariantExposure(input) { flags.exposePaywall(input); },
  };
}
export function createReviewPresetPort(flags: PostHogFlagsController) {
  return {
    async isEnabled() { return await flags.get('review_preset') === true; },
    expose() { flags.expose('review_preset', 'onboarding'); },
  };
}

export function createSignInRequiredPort(flags: PostHogFlagsController): SignInRequiredPort {
  return { async isRequired() { return await flags.get('signInRequired') === true; } };
}

export type SemanticScreen = { name: string; props?: Record<string, string | number | boolean> };

const callerScreens: Record<string, string> = { Home: 'home', P: 'paywall' };

const onboardingStepPattern = /^(?:O(?:0[1-9]|1[0-9]|2[0-2])|W[0-3]|G(?:[12]|0[FH])|[RB][12]|D|S(?:[1-3]|3[b-d])|T[1-4])$/;
const setupStepPattern = /^(?:X\d|account|apps|motion|location|gym|done)$/;

const routes: Record<string, string> = {
  '/home': 'home',
  '/conditions': 'conditions',
  '/analytics': 'analytics',
  '/settings': 'settings',
  '/settings/account': 'settings_account',
  '/settings/subscription': 'settings_subscription',
  '/settings/preferences': 'settings_preferences',
  '/settings/units': 'settings_units',
  '/settings/gyms': 'settings_gyms',
  '/settings/report': 'settings_report',
  '/settings/feedback': 'settings_feedback',
  '/settings/legal': 'settings_legal',
  '/builder': 'builder',
  '/gym-picker': 'gym_picker',
  '/unlock/gym': 'unlock_gym',
  '/unlock/treadmill': 'unlock_treadmill',
  '/paywall': 'paywall',
  '/sign-in': 'sign_in',
};

const dynamicRoutes: readonly { prefix: string; param: string; name: string; test: RegExp }[] = [
  { prefix: '/onboarding/', param: 'step', name: 'onboarding', test: onboardingStepPattern },
  { prefix: '/setup/', param: 'step', name: 'setup', test: setupStepPattern },
  { prefix: '/permissions/', param: 'step', name: 'permissions', test: /^(?:apps|motion|location|gym)$/ },
  { prefix: '/settings/legal/', param: 'doc', name: 'settings_legal', test: /^(?:terms|privacy)$/ },
  { prefix: '/settings/permission/', param: 'permission', name: 'settings_permission', test: /^(?:screenTime|motion|location|camera|notifications)$/ },
];

export function semanticScreenName(path: string): SemanticScreen | null {
  const clean = path.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  const direct = routes[clean];
  if (direct) return { name: direct };
  if (!clean.startsWith('/')) {
    const caller = callerScreens[clean];
    if (caller) return { name: caller };
    for (const [pattern, name] of [[onboardingStepPattern, 'onboarding'], [setupStepPattern, 'setup']] as const) {
      if (pattern.test(clean)) return { name, props: { step: clean } };
    }
    return null;
  }
  for (const route of dynamicRoutes) {
    if (!clean.startsWith(route.prefix)) continue;
    const value = clean.slice(route.prefix.length);
    return route.test.test(value) ? { name: route.name, props: { [route.param]: value } } : null;
  }
  return null;
}

