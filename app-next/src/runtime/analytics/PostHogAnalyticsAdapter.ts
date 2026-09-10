import type { AnalyticsPort } from '../../ports/AnalyticsPort';

export type CanonicalIdentity = { userId: string | null; generation: number; ready: boolean };
export type WalkPlaces = 'outside' | 'treadmill' | 'outside_and_treadmill' | 'none';
export type AnalyticsContext = { environment: string; runtime_version: string; update_id: string; walk_places: WalkPlaces };
export interface PostHogClientBoundary {
  ready(): Promise<void>; getDeviceId(): string; getDistinctId(): string;
  register(properties: Record<string, unknown>): Promise<void> | void;
  identify(id: string): void; reset(): void; optIn(): Promise<void>; optOut(): Promise<void>;
  clearPendingQueues(): Promise<void> | void;
  capture(event: string, properties?: Record<string, unknown>): Promise<void> | void;
  screen(name: string, properties?: Record<string, unknown>): Promise<void> | void;
  onFeatureFlags(callback: () => void): () => void;
  getFeatureFlag(key: string, options?: { sendEvent?: boolean }): boolean | string | undefined;
}
export const POSTHOG_OPTIONS = {
  captureAppLifecycleEvents: false, enableSessionReplay: false, preloadFeatureFlags: false,
  disableSurveys: true, errorTracking: { autocaptureErrors: false },
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
}): AnalyticsPort & { discardPending(): Promise<void>; flags: PostHogFlagsController } {
  const { client } = options;
  let committed: CanonicalIdentity | null = null;
  const register = async () => client.register({ ...options.getContext(), $device_id: client.getDeviceId() });
  const allowed = () => {
    const live = options.getIdentity();
    return options.analyticsEnabled() && live.ready && !!committed && live.userId === committed.userId && live.generation === committed.generation;
  };
  const flags = new PostHogFlagsController(client, options.getIdentity, options.analyticsEnabled, () => committed);
  const emit = (action: () => Promise<void> | void) => {
    void (async () => {
      await register();
      // register can cross an auth generation while it awaits storage. Never let
      // the continuation enqueue an event for the next account.
      if (allowed()) await action();
    })().catch(() => undefined);
  };
  return {
    async identify(id) {
      await client.ready();
      await register(); // device id is primed before identify's implicit flags request
      if (options.analyticsEnabled()) await client.optIn(); else await client.optOut();
      client.identify(id);
      const live = options.getIdentity();
      if (live.userId !== id) throw new Error('Analytics identity changed during identify');
      committed = { ...live };
      await register();
      flags.beginGeneration(live.generation);
    },
    track(event, props) { if (!allowed() || /^(purchase_|trial_|subscription_)/.test(event)) return; emit(() => client.capture(event, scrubAnalyticsProps(props))); },
    screen(name) { if (!allowed()) return; const route = semanticScreenName(name); if (!route) return; emit(() => client.screen(route)); },
    async reset() { committed = null; flags.invalidate(); await client.optOut(); await client.clearPendingQueues(); client.reset(); await client.ready(); await register(); if (options.analyticsEnabled()) await client.optIn(); },
    async discardPending() { await client.optOut(); await client.clearPendingQueues(); },
    flags,
  };
}

export type FlagName = 'paywall_variant' | 'signInRequired' | 'onboarding_variant';
export type PaywallVariant = 'control' | 'variant_b';
const allowedFlags: Record<FlagName, readonly (string | boolean)[]> = { paywall_variant: ['control', 'variant_b'], signInRequired: [false, true], onboarding_variant: ['control', 'variant_b'] };
export class PostHogFlagsController {
  private generation = -1; private settled = new Map<FlagName, string | boolean>(); private exposures = new Set<string>(); private unsubscribe?: () => void;
  constructor(private client: PostHogClientBoundary, private identity: () => CanonicalIdentity, private optedIn: () => boolean, private committed: () => CanonicalIdentity | null) {}
  beginGeneration(generation: number) { this.invalidate(); this.generation = generation; }
  invalidate() { this.unsubscribe?.(); this.unsubscribe = undefined; this.settled.clear(); this.exposures.clear(); this.generation = -1; }
  async get(name: FlagName, timeoutMs = 2_000): Promise<string | boolean> {
    if (this.settled.has(name)) return this.settled.get(name)!;
    const live = this.identity(), committed = this.committed();
    if (!this.optedIn() || !live.ready || !committed || live.generation !== this.generation || live.userId !== committed.userId) return name === 'signInRequired' ? false : 'control';
    let timeout: number | undefined;
    let off: (() => void) | undefined;
    const value = await Promise.race([new Promise<string | boolean | undefined>((resolve) => {
      const current = this.client.getFeatureFlag(name, { sendEvent: false }); if (current !== undefined) return resolve(current);
      off = this.client.onFeatureFlags(() => { off?.(); resolve(this.client.getFeatureFlag(name, { sendEvent: false })); });
    }), new Promise<undefined>((resolve) => { timeout = setTimeout(resolve, timeoutMs); })]);
    if (timeout) clearTimeout(timeout);
    off?.();
    const fallback = name === 'signInRequired' ? false : 'control';
    const accepted = allowedFlags[name].includes(value as never) ? value! : fallback;
    if (this.identity().generation !== this.generation) return fallback;
    this.settled.set(name, accepted); return accepted;
  }
  expose(name: FlagName, placement: string) { const live = this.identity(); const key = `${this.generation}:${name}:${placement}`; if (!this.settled.has(name) || this.exposures.has(key) || !this.optedIn() || !live.ready || live.generation !== this.generation) return; this.exposures.add(key); this.client.getFeatureFlag(name, { sendEvent: true }); }
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
