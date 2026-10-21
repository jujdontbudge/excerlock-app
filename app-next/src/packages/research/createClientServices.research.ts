import { createAccountBoundExport } from '../runtime/AccountBoundExport';
import { createNativeNotifications } from '../notifications/createNativeNotifications';
import { createNativeJsonExport } from '../runtime/NativeJsonExport';
import { createPaywallExperimentPort, createReviewPresetPort, createSignInRequiredPort } from '../telemetry/PostHogAnalyticsAdapter';
import { createOnboardingFlowPort } from '../onboarding/flowOrder';
import { entitlementStore } from '../subscription/entitlementStore';
import type { Session } from '../model/types';
import type { AuthIdentity, AuthPort } from '../ports/AuthPort';
import type { SubscriptionEntitlement, SubscriptionPaywall, SubscriptionPort } from '../ports/SubscriptionPort';
import type { Unsubscribe } from '../model/models';
import { createPostHogRuntime } from './createPostHogRuntime.research';
import { initializeSentrySdk } from './SentryBinding.research';


export const LAB_RESEARCH_USER_ID = 'lab-local-linked-trace';
const LAB_IDENTITY: AuthIdentity = Object.freeze({
  kind: 'canonical',
  userId: LAB_RESEARCH_USER_ID,
  isAnonymous: true,
  generation: 1,
  ready: true,
});
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
    waitForReady: async () => LAB_IDENTITY,
    boot: async () => LAB_IDENTITY,
    waitForCanonicalIdentity: async () => LAB_IDENTITY,
    signInWithApple: async () => { throw new LabIdentityUnavailableError(); },
    signInWithGoogle: async () => { throw new LabIdentityUnavailableError(); },
    linkWithApple: async () => { throw new LabIdentityUnavailableError(); },
    linkWithGoogle: async () => { throw new LabIdentityUnavailableError(); },
    recoverWithApple: async () => { throw new LabIdentityUnavailableError(); },
    recoverWithGoogle: async () => { throw new LabIdentityUnavailableError(); },
    sendEmailCode: async () => { throw new LabIdentityUnavailableError(); },
    verifyEmailCode: async () => { throw new LabIdentityUnavailableError(); },
    recoverWithEmailCode: async () => { throw new LabIdentityUnavailableError(); },
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
  const publish = () => entitlementStore.getState().patch({ entitlement: LAB_ENTITLEMENT });
  const noRecovery = { type: 'none' as const };
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
    recovery: () => noRecovery,
    recoveryReady: async () => undefined,
    clearRecovery: async () => undefined,
    subscribeRecovery: () => () => undefined,
    subscribe: (callback) => subscribe(subscribers, callback),
  };
}

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
    incidentReports: { post: async () => { throw new LabIdentityUnavailableError(); } },
    experiments: createPaywallExperimentPort(telemetry.analytics.flags),
    signInRequired: createSignInRequiredPort(telemetry.analytics.flags),
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
