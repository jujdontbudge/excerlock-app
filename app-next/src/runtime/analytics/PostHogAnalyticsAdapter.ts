import { eventsOwnedBy } from '@excerlock/analytics-events';
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
// Bounded ids/enums only: no whitespace, no `@`, never longer than 64 chars. Dots are
// allowed because Adapty product ids are dotted (`a.annual`, `annual.3999.t7`).
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
/**
 * The one runtime allowlist for `track()`: exactly the registry's client-owned
 * event names. Adapty owns every subscription/trial lifecycle name, so those
 * stay blocked here even though the client emits the funnel's intent half
 * (`paywall_viewed`, `purchase_started`, `purchase_failed`, `restore_*`).
 */
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
  // Screens requested while the rail cannot capture yet. Cold start is the
  // common case: the first route and the step caller both fire while the
  // identity spine is still in flight, so the event would otherwise be lost.
  // Only a bounded tail is kept, because a rail that never becomes allowed
  // (offline identity spine) must not grow this without limit. Consent-off
  // requests never queue, so nothing is captured before the user opts in.
  const pendingScreens: { key: string; spec: SemanticScreen }[] = [];
  const maxPendingScreens = 24;
  const screenKey = (spec: SemanticScreen) => JSON.stringify([spec.name, spec.props ?? null]);
  const rememberScreen = (entry: { key: string; spec: SemanticScreen }) => {
    if (pendingScreens[pendingScreens.length - 1]?.key === entry.key) return;
    pendingScreens.push(entry);
    if (pendingScreens.length > maxPendingScreens) pendingScreens.shift();
  };
  /** Emits the screens kept while the rail was not allowed, oldest first. */
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
      // Re-identify while the spine is already ready has no later identity
      // event, so the commit itself is the moment cold-start screens can go.
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
      // One navigation can report the same screen twice: the root pathname
      // subscriber fires for every route, and the four step-level callers fire
      // for their own screen. Deduplicate on the semantic result so a single
      // navigation emits `$screen` once.
      const key = screenKey(spec);
      if (key === shownScreen) return;
      // Consent off captures nothing, now or later: the user must enable
      // analytics while looking at a screen to report it.
      if (!options.analyticsEnabled()) { pendingScreens.length = 0; return; }
      const started = origin();
      if (!allowed(started)) { rememberScreen({ key, spec }); return; }
      shownScreen = key;
      void emit(started!, () => client.screen(spec.name, spec.props));
    },
    replayPendingScreens,
    setWalkPlaces(value) {
      const started = origin(); if (!allowed(started)) return;
      // The installed SDK emits the documented `$set` update. Avoid a flag
      // reload so an already-mounted surface cannot change underneath the user.
      void emit(started!, () => client.setPersonProperties({ walk_places: value }, false));
    },
    async reset() { committed = null; shownScreen = null; pendingScreens.length = 0; flags.invalidate(); await client.optOut(); await client.clearPendingQueues(); client.reset(); await client.ready(); await register(); if (options.analyticsEnabled()) await client.optIn(); },
    async discardPending() { committed = null; pendingScreens.length = 0; flags.invalidate(); await client.optOut(); await client.clearPendingQueues(); },
    flags,
  };
}

export type FlagName = 'paywall_variant' | 'signInRequired' | 'review_preset';
/** Payload flags carry remote configuration, never experiment exposure events. */
const allowedPayloadFlags = { shield_copy: true, onboarding_variant: true } as const;
export type PayloadFlagName = keyof typeof allowedPayloadFlags;
export type PaywallVariant = 'control' | 'variant_b';
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
  /**
   * Reads a payload flag's object (currently the remote shield copy).
   *
   * Returns the live SDK payload when flags have already settled and only waits
   * for the next settlement (or the timeout) when they have not. Exposure events
   * stay off: this is configuration, not a mounted experiment surface.
   */
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
export function createReviewPresetPort(flags: PostHogFlagsController) {
  return {
    async isEnabled() { return await flags.get('review_preset') === true; },
    expose() { flags.expose('review_preset', 'onboarding'); },
  };
}

/** Boolean gate behind every `SignInScreen` mount (`resolveSignInRequired`). */
export interface SignInRequiredPort {
  /** `true` makes the sign-in step blocking; an absent or unanswered flag is `false`. */
  isRequired(): Promise<boolean>;
}
export function createSignInRequiredPort(flags: PostHogFlagsController): SignInRequiredPort {
  // The controller answers the false fallback while the identity is not ready,
  // so an unanswered flag keeps X4 skippable instead of locking the user out.
  return { async isRequired() { return await flags.get('signInRequired') === true; } };
}

/** A resolved `$screen`: the semantic route name plus its bounded qualifiers. */
export type SemanticScreen = { name: string; props?: Record<string, string | number | boolean> };

/** Bare ids the two step-level callers pass instead of a route path (HomeScreen, PaywallSlot). */
const callerScreens: Record<string, string> = { Home: 'home', P: 'paywall' };

/** Onboarding step ids (`O01…O20`, then the S/T/W/G branches) from `src/onboarding/flow.ts`. */
const onboardingStepPattern = /^(?:O\d{2}|[STWG]\d)$/;
/** Setup step ids `X1…X5` from `src/onboarding/setupFlow.ts`. */
const setupStepPattern = /^X\d$/;

/** Static production routes, keyed by exactly what `usePathname()` returns. */
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
  '/settings/bug': 'settings_bug',
  '/settings/feedback': 'settings_feedback',
  '/settings/legal': 'settings_legal',
  '/builder': 'builder',
  '/gym-picker': 'gym_picker',
  '/unlock/gym': 'unlock_gym',
  '/unlock/treadmill': 'unlock_treadmill',
  '/paywall': 'paywall',
  '/sign-in': 'sign_in',
};

/**
 * Dynamic routes. Each entry validates the `[param]` value against the app's
 * own bounded vocabulary and carries it as a prop, so a junk deep link never
 * reaches PostHog (D12). `screenCoverage.test.ts` walks `app/` and fails when a
 * production route has no mapping here.
 */
const dynamicRoutes: readonly { prefix: string; param: string; name: string; test: RegExp }[] = [
  { prefix: '/onboarding/', param: 'step', name: 'onboarding', test: onboardingStepPattern },
  { prefix: '/setup/', param: 'step', name: 'setup', test: setupStepPattern },
  { prefix: '/settings/legal/', param: 'doc', name: 'settings_legal', test: /^(?:terms|privacy)$/ },
  { prefix: '/settings/permission/', param: 'permission', name: 'settings_permission', test: /^(?:screenTime|motion|location|camera|notifications)$/ },
];

/**
 * Maps a route path from `usePathname()` — or a bare step id from the four
 * step-level callers — to the semantic `$screen` result. Unmapped input (the
 * launch gate, `/dev`, the lab-only recorder, unknown ids) returns null.
 */
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

