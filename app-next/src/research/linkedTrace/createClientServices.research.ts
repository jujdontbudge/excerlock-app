import { createAccountBoundExport } from '../../runtime/AccountBoundExport';
import { createNativeNotifications } from '../../runtime/notifications/createNativeNotifications';
import { createNativeJsonExport } from '../../runtime/NativeJsonExport';
import { createPaywallExperimentPort, createReviewPresetPort, createSignInRequiredPort } from '../../runtime/analytics/PostHogAnalyticsAdapter';
import { createOnboardingFlowPort } from '../../onboarding/flowOrder';
import { entitlementStore } from '../../state/entitlementStore';
import type { Session } from '../../domain/types';
import type { AuthIdentity, AuthPort } from '../../ports/AuthPort';
import type { SubscriptionEntitlement, SubscriptionPaywall, SubscriptionPort } from '../../ports/SubscriptionPort';
import type { Unsubscribe } from '../../ports/models';
import { createPostHogRuntime } from './createPostHogRuntime.research';
import { initializeSentrySdk } from './SentryBinding.research';

/**
 * The isolated lab's identity graph.
 *
 * The standalone Trace Lab measures ExcerLock's real enforcement and motion
 * behavior, but it is research-only: it must never initialize, authenticate,
 * or identify against production Supabase or production Adapty. This factory
 * constructs a local canonical identity and a local research entitlement and
 * uses only lab-local observability (no-op PostHog, no-op Sentry). No Supabase
 * client, Adapty SDK activation, production key, or network call is reachable
 * from here; Metro selects this module instead of `runtime/createClientServices`
 * for research builds (see `@client-services` in metro.config.js).
 */

/** Fixed local identity. It is never a Supabase user and never uploaded. */
export const LAB_RESEARCH_USER_ID = 'lab-local-linked-trace';
const LAB_IDENTITY: AuthIdentity = Object.freeze({
  kind: 'canonical',
  userId: LAB_RESEARCH_USER_ID,
  isAnonymous: true,
  generation: 1,
  ready: true,
});
/** Local research entitlement: enough for the guided test's enforcement path. */
const LAB_ENTITLEMENT: SubscriptionEntitlement = Object.freeze({
  status: 'active',
  renewsAt: null,
  offer: Object.freeze({ trialDays: 0, reminderDaysBefore: 0, label: 'Isolated research build' }),
});

class LabIdentityUnavailableError extends Error {
  constructor() {
    super('Trace Lab is an isolated research build. Production accounts, purchases, and restores are not available here.');
    this.name = 'LabIdentityUnavailableError';
  }
}

function createLabAuth(): AuthPort {
  const identitySubscribers = new Set<(identity: AuthIdentity) => void>();
  const sessionSubscribers = new Set<(session: Session) => void>();
  return {
    session: () => ({ kind: 'anonymous' }),
    identity: () => LAB_IDENTITY,
    // The lab identity is fixed and local, so there is nothing to boot or wait
    // for; boot is still explicit to keep the production boot contract.
    boot: async () => LAB_IDENTITY,
    waitForCanonicalIdentity: async () => LAB_IDENTITY,
    signInWithApple: async () => { throw new LabIdentityUnavailableError(); },
    signInWithGoogle: async () => { throw new LabIdentityUnavailableError(); },
    recoverWithApple: async () => { throw new LabIdentityUnavailableError(); },
    recoverWithGoogle: async () => { throw new LabIdentityUnavailableError(); },
    sendEmailCode: async () => { throw new LabIdentityUnavailableError(); },
    verifyEmailCode: async () => { throw new LabIdentityUnavailableError(); },
    deleteAccount: async () => { throw new LabIdentityUnavailableError(); },
    signOut: async () => { throw new LabIdentityUnavailableError(); },
    subscribe: (callback) => subscribe(sessionSubscribers, callback),
    subscribeIdentity: (callback) => subscribe(identitySubscribers, callback),
    dispose: () => {
      identitySubscribers.clear();
      sessionSubscribers.clear();
    },
  };
}

function subscribe<T>(subscribers: Set<(value: T) => void>, callback: (value: T) => void): Unsubscribe {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function createLabSubscription(): SubscriptionPort {
  // The guided screen reads the entitlement store, so the local research
  // entitlement must be the store's value; production Adapty never writes it.
  const publish = () => entitlementStore.getState().patch({ entitlement: LAB_ENTITLEMENT });
  publish();
  const subscribers = new Set<(entitlement: SubscriptionEntitlement) => void>();
  return {
    entitlement: () => LAB_ENTITLEMENT,
    presentPaywall: async () => LAB_ENTITLEMENT,
    restore: async () => LAB_ENTITLEMENT,
    refresh: async () => LAB_ENTITLEMENT,
    identify: async () => undefined,
    reset: async () => { publish(); },
    loadPaywall: async (placement: SubscriptionPaywall['placement']) => {
      void placement;
      throw new LabIdentityUnavailableError();
    },
    logPaywallShown: async () => undefined,
    purchase: async () => { throw new LabIdentityUnavailableError(); },
    manageSubscription: async () => { throw new LabIdentityUnavailableError(); },
    operation: () => ({ busy: false, pending: false, error: null }),
    subscribe: (callback) => subscribe(subscribers, callback),
  };
}

/** Same returned shape as the production factory, with a lab-local identity. */
export async function createClientServices(options: {
  version: string;
  build: string;
  beforeDelete(): Promise<void>;
  afterDelete(): Promise<void>;
  reportError(error: unknown): void;
}) {
  void options.beforeDelete;
  void options.afterDelete;
  void options.reportError;
  // The lab binding is a no-op: no Sentry SDK, no network, no production DSN.
  initializeSentrySdk();
  const auth = createLabAuth();
  const subscription = createLabSubscription();
  const telemetry = createPostHogRuntime({ apiKey: 'linked-trace-local' }, {
    getIdentity: () => auth.identity(),
    analyticsEnabled: () => false,
    getContext: () => ({ environment: 'lab', runtime_version: 'embedded', update_id: 'embedded', walk_places: 'none' }),
  });
  let disposed = false;
  const notifications = createNativeNotifications(() => !disposed, () => auth.identity().generation);
  const exporter = createNativeJsonExport(() => !disposed);
  const dataExport = createAccountBoundExport(() => auth.identity(), exporter, () => disposed);
  return {
    auth,
    subscription,
    analytics: telemetry.analytics,
    // The lab has no API identity, so a report cannot leave the device.
    incidentReports: { post: async () => { throw new LabIdentityUnavailableError(); } },
    experiments: createPaywallExperimentPort(telemetry.analytics.flags),
    signInRequired: createSignInRequiredPort(telemetry.analytics.flags),
    // The lab has no identity spine: the rail reads once and stays bundled.
    onboardingFlow: createOnboardingFlowPort({
      readPayload: () => telemetry.analytics.flags.getPayload('onboarding_variant'),
    }),
    reviewPreset: createReviewPresetPort(telemetry.analytics.flags),
    notifications,
    dataExport,
    boot: () => auth.boot(),
    waitForIdentityReady: () => auth.waitForCanonicalIdentity(),
    runIdentityOperation: <T,>(operation: () => Promise<T>) => operation(),
    dispose: async () => {
      disposed = true;
      auth.dispose();
      await telemetry.dispose();
    },
  };
}
