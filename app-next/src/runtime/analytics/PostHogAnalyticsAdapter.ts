import type { AnalyticsPort } from '../../ports/AnalyticsPort';

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
}
export const POSTHOG_OPTIONS = {
  captureAppLifecycleEvents: false, enableSessionReplay: false, preloadFeatureFlags: false,
  disableSurveys: true, disableGeoip: true, defaultOptIn: false,
  capturePushNotificationSubscriptions: false, capturePushNotificationOpened: false,
  setDefaultPersonProperties: false, errorTracking: { autocapture: false },
  personProfiles: 'identified_only',
} as const;
const forbidden = /email|address|latitude|longitude|receipt|token|user_?id|message|error|url/i;
export function scrubAnalyticsProps(props: Record<string, unknown> = {}): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (forbidden.test(key)) continue;
    if (typeof value === 'boolean' || typeof value === 'number') clean[key] = value;
    else if (typeof value === 'string' && /^[a-z0-9_-]{1,64}$/i.test(value)) clean[key] = value;
  }
  return clean;
}
export function createPostHogAnalyticsAdapter(options: {
  client: PostHogClientBoundary; getIdentity: () => CanonicalIdentity;
  analyticsEnabled: () => boolean; getContext: () => AnalyticsContext;
}): AnalyticsPort & { discardPending(): Promise<void>; setWalkPlaces(value: WalkPlaces): void; flags: PostHogFlagsController } {
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
  return {
    async setEnabled(enabled) {
      const epoch = ++consentEpoch;
      flags.invalidate();
      await client.optOut();
      await client.clearPendingQueues();
      if (epoch !== consentEpoch || !enabled || !options.analyticsEnabled()) return;
      const started = origin();
      if (!started || !committed || committed.userId !== started.userId || committed.generation !== started.generation) return;
      await client.optIn();
      if (epoch !== consentEpoch || !options.analyticsEnabled()) { await client.optOut(); return; }
      flags.beginGeneration(started.generation);
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
    },
    track(event, props) {
      const started = origin();
      if (!allowed(started) || /^(purchase_|trial_|subscription_)/.test(event)) return;
      const walkPlaces = event === 'walk_places_updated' ? normalizeWalkPlaces(props?.walk_places) : null;
      if (event === 'walk_places_updated' && walkPlaces === null) return;
      void emit(started!, async () => {
        if (event === 'walk_places_updated') await client.setPersonProperties({ walk_places: walkPlaces as WalkPlaces }, false);
        if (allowed(started)) await client.capture(event, scrubAnalyticsProps(walkPlaces === null ? props : { ...props, walk_places: walkPlaces }));
      });
    },
    screen(name) {
      const started = origin();
      if (!allowed(started)) return;
      const route = semanticScreenName(name); if (!route) return;
      void emit(started!, () => client.screen(route));
    },
    setWalkPlaces(value) {
      const started = origin(); if (!allowed(started)) return;
      // The installed SDK emits the documented `$set` update. Avoid a flag
      // reload so an already-mounted surface cannot change underneath the user.
      void emit(started!, () => client.setPersonProperties({ walk_places: value }, false));
    },
    async reset() { committed = null; flags.invalidate(); await client.optOut(); await client.clearPendingQueues(); client.reset(); await client.ready(); await register(); if (options.analyticsEnabled()) await client.optIn(); },
    async discardPending() { committed = null; flags.invalidate(); await client.optOut(); await client.clearPendingQueues(); },
    flags,
  };
}

export type FlagName = 'paywall_variant' | 'signInRequired' | 'onboarding_variant';
export type PaywallVariant = 'control' | 'variant_b';
const allowedFlags: Record<FlagName, readonly (string | boolean)[]> = { paywall_variant: ['control', 'variant_b'], signInRequired: [false, true], onboarding_variant: ['control', 'variant_b'] };
type FlagValue = string | boolean;
type FlagOrigin = { userId: string; generation: number };
type PendingFlag = { promise: Promise<FlagValue>; resolve: (value: FlagValue) => void; off?: () => void; timeout?: ReturnType<typeof globalThis.setTimeout>; origin: FlagOrigin };
export class PostHogFlagsController {
  private generation = -1;
  private settled = new Map<FlagName, FlagValue>();
  private exposures = new Set<string>();
  private pending = new Map<FlagName, PendingFlag>();
  constructor(
    private client: PostHogClientBoundary,
    private identity: () => CanonicalIdentity,
    private optedIn: () => boolean,
    private committed: () => CanonicalIdentity | null,
    private captureExposure: (origin: FlagOrigin, properties: Record<string, string | number | boolean>) => Promise<boolean>,
  ) {}
  private fallback(name: FlagName): FlagValue { return name === 'signInRequired' ? false : 'control'; }
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
    this.pending.clear(); this.settled.clear(); this.exposures.clear(); this.generation = -1;
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
  expose(name: FlagName, placement: string) {
    const live = this.identity(); const started = live.userId ? { userId: live.userId, generation: live.generation } : undefined;
    const value = this.settled.get(name); const key = `${this.generation}:${name}:${placement}`;
    if (value === undefined || this.exposures.has(key) || !this.eligible(started)) return;
    this.exposures.add(key);
    // Snapshot the value shown by the mounted surface. Calling getFeatureFlag
    // here would expose a late SDK value instead of the stable assignment.
    void this.captureExposure(started, { $feature_flag: name, $feature_flag_response: value }).then((captured) => {
      if (!captured) this.exposures.delete(key);
    });
  }
  exposePaywall(input: PaywallVariantExposure) {
    if (input.generation !== this.generation || this.settled.get('paywall_variant') !== input.variant) return;
    this.expose('paywall_variant', `${input.placement}:${input.flowVariationId}`);
  }
}

export type PaywallVariantExposure = { variant: PaywallVariant; placement: string; flowVariationId: string; generation: number };
export interface PaywallExperimentPort {
  getPaywallVariant(): Promise<PaywallVariant>;
  trackPaywallVariantExposure(input: PaywallVariantExposure): void;
}
export function createPaywallExperimentPort(flags: PostHogFlagsController): PaywallExperimentPort {
  return {
    async getPaywallVariant() { return await flags.get('paywall_variant') as PaywallVariant; },
    trackPaywallVariantExposure(input) { flags.exposePaywall(input); },
  };
}

const routes: Record<string, string> = { '/home': 'home', '/conditions': 'conditions', '/analytics': 'analytics', '/settings': 'settings', '/setup': 'setup', '/paywall': 'paywall', '/sign-in': 'sign_in' };
export function semanticScreenName(path: string): string | null { const clean = path.split('?')[0].split('#')[0].replace(/\/$/, '') || '/'; return routes[clean] ?? null; }
