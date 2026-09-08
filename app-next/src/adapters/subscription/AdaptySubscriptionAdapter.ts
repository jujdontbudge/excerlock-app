import type { AdaptyFlow, FileLocation } from 'react-native-adapty';
import { Entitlement } from '../../domain/types';
import { mergeRestoredEntitlement } from '../../domain/mergeRestoredEntitlement';
import { Unsubscribe } from '../../ports/models';
import {
  SubscriptionEntitlement,
  SubscriptionPlacement,
  SubscriptionPlan,
  SubscriptionPort,
  TrialOffer,
} from '../../ports/SubscriptionPort';
import { entitlementStore } from '../../state/entitlementStore';
import { AdaptySdk } from './adaptySdk';
import { entitlementFromProfile } from './entitlementFromProfile';
import { awaitFlowOutcome } from './flowPresentation';
import { assertCompliantFallback, paywallComplianceViolations } from './paywallCompliance';
import { DEFAULT_TRIAL_OFFER, trialOfferFromProducts } from './trialOffer';

/** A launch has this long to produce a real status before the app runs on the last known-good one. */
export const LAUNCH_BUDGET_MS = 3_000;
/** How long Adapty may spend fetching a placement before it answers from its cache or the fallback. */
export const PLACEMENT_TIMEOUT_MS = 5_000;

const NONE: Entitlement = { status: 'none', renewsAt: null };

export type SubscriptionIssue =
  'activate' | 'launch' | 'identify' | 'logout' | 'offer' | 'fallback' | 'paywallCompliance';

export type SubscriptionAdapterOptions = {
  apiKey: string;
  sdk: AdaptySdk;
  budgetMs?: number;
  /** The dashboard's fallback export, bundled by the `react-native-adapty` config plugin. */
  fallback?: { location: FileLocation; payload: unknown };
  /** Where operational problems go until P2-T07 hands them to Sentry. Never user-facing. */
  onIssue?: (scope: SubscriptionIssue, detail: unknown) => void;
};

export type SubscriptionAdapter = SubscriptionPort & {
  /** Settles once the launch produced a status, either from Adapty or from the last known-good one. */
  readonly resolved: Promise<Entitlement>;
  dispose(): void;
};

/**
 * `SubscriptionPort` on Adapty with the Paywall Builder.
 *
 * The entitlement store is the published state and the last known-good cache in one: it is persisted,
 * so a launch that cannot reach Adapty runs on the status the device already trusted rather than
 * stranding the user on the splash. Every status change — launch, purchase, restore, and the profile
 * refresh that mirrors a server-side webhook — goes through `publish`, which writes only real changes.
 */
export function createSubscriptionAdapter({
  apiKey,
  sdk,
  budgetMs = LAUNCH_BUDGET_MS,
  fallback,
  onIssue,
}: SubscriptionAdapterOptions): SubscriptionAdapter {
  if (fallback) assertCompliantFallback(fallback.payload);

  let offer: TrialOffer = DEFAULT_TRIAL_OFFER;
  let listener: { remove(): void } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  const read = (): Entitlement => entitlementStore.getState().data.entitlement;
  const persisted = read();
  let lastKnownGood: Entitlement | undefined = persisted.status === 'unknown' ? undefined : persisted;

  const report = (scope: SubscriptionIssue, detail: unknown) => {
    try {
      onIssue?.(scope, detail);
    } catch {
      // Reporting is never allowed to break a purchase.
    }
  };

  const publish = (next: Entitlement): Entitlement => {
    if (disposed) return read();
    if (next.status !== 'unknown') lastKnownGood = next;
    const current = read();
    if (current.status === next.status && current.renewsAt === next.renewsAt) return current;
    entitlementStore.getState().patch({ entitlement: next });
    return next;
  };

  const ready = sdk.activate(apiKey).then(
    async () => {
      listener = sdk.onProfileLoad((profile) => publish(entitlementFromProfile(profile)));
      if (fallback) await sdk.setFallback(fallback.location).catch((cause) => report('fallback', cause));
    },
    (cause) => {
      report('activate', cause);
      throw cause;
    },
  );
  // The launch path handles activation failure; this keeps it from surfacing as an unhandled rejection.
  void ready.catch(() => undefined);

  /** Nothing arrived in time: keep what the device already trusted, and never leave `unknown` standing. */
  const lastKnownGoodStatus = (): Entitlement => {
    const current = read();
    return current.status === 'unknown' ? publish(lastKnownGood ?? NONE) : current;
  };

  const loadOffer = async () => {
    try {
      const flow = await sdk.getFlow('onboarding', PLACEMENT_TIMEOUT_MS);
      const next = trialOfferFromProducts(await sdk.getProducts(flow));
      if (next) offer = next;
    } catch (cause) {
      report('offer', cause);
    }
  };

  const resolved = (async (): Promise<Entitlement> => {
    const budget = new Promise<'budget'>((resolve) => {
      timer = setTimeout(() => resolve('budget'), budgetMs);
    });
    const profile = ready.then(() => sdk.getProfile()).then(entitlementFromProfile);
    const race = await Promise.race([
      profile.then(
        (entitlement) => ({ kind: 'profile' as const, entitlement }),
        (cause) => ({ kind: 'failed' as const, cause }),
      ),
      budget,
    ]);
    if (timer) clearTimeout(timer);
    let settled: Entitlement;
    if (race === 'budget') {
      settled = lastKnownGoodStatus();
      // A slow answer still counts, it is just no longer allowed to hold up the app.
      void profile.then(publish, (cause) => report('launch', cause));
    } else if (race.kind === 'failed') {
      report('launch', race.cause);
      settled = lastKnownGoodStatus();
    } else {
      settled = publish(race.entitlement);
    }
    // Only a user with nothing can see the trial screens, so only they need the live offer.
    if (settled.status === 'none') void loadOffer();
    return settled;
  })();

  let queue: Promise<unknown> = ready;
  const enqueue = (scope: SubscriptionIssue, work: () => Promise<unknown>) => {
    queue = queue.then(work).catch((cause) => report(scope, cause));
  };

  const presentPaywall = async (placement: SubscriptionPlacement, plan: SubscriptionPlan): Promise<Entitlement> => {
    await ready;
    const flow = await sdk.getFlow(placement, PLACEMENT_TIMEOUT_MS);
    reportCompliance(placement, flow);
    const view = await sdk.createFlowView(flow, { SELECTED_PLAN: plan });
    const { outcome, stop } = awaitFlowOutcome(view, { current: read, publish, fromProfile: entitlementFromProfile });
    try {
      await view.present();
      void sdk.logShow(flow).catch(() => undefined);
      return await outcome;
    } finally {
      stop();
    }
  };

  const reportCompliance = (placement: SubscriptionPlacement, flow: AdaptyFlow) => {
    const missing = paywallComplianceViolations({
      payload: flow.payloadData,
      remoteConfigs: flow.remoteConfigs,
      paywalls: flow.paywalls,
    });
    if (missing.length > 0) report('paywallCompliance', { placement, missing });
  };

  return {
    resolved,
    entitlement: (): SubscriptionEntitlement => ({ ...read(), offer }),
    presentPaywall,
    restore: async (): Promise<Entitlement> => {
      await ready;
      const current = read();
      const merged = mergeRestoredEntitlement(current, entitlementFromProfile(await sdk.restorePurchases()));
      return merged === current ? current : publish(merged);
    },
    identify: (userId: string) => enqueue('identify', () => sdk.identify(userId)),
    reset: () => {
      enqueue('logout', () => sdk.logout());
      lastKnownGood = undefined;
      entitlementStore.getState().reset();
    },
    subscribe: (callback: (entitlement: Entitlement) => void): Unsubscribe =>
      entitlementStore.subscribe((state) => callback(state.data.entitlement)),
    dispose: () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      listener?.remove();
      listener = undefined;
    },
  };
}
