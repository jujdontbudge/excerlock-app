import { createIdentityServices } from './lib/createIdentityServices';
import { createPostHogRuntime } from '@posthog-runtime';
import {
  createPaywallExperimentPort,
  createReviewPresetPort,
  createSignInRequiredPort,
  normalizeWalkPlaces,
} from '../telemetry/PostHogAnalyticsAdapter';
import { createOnboardingFlowPort } from '../onboarding/flowOrder';
import { initializeSentrySdk } from '@sentry-binding';
import { getOtaObservabilityContext } from '../updates/updates';
import { readClientConfiguration } from '../platform/clientConfiguration';
import { verifiedStoreEnvironment, xcodeEntitlementTransactions } from '../platform/NativeStoreEnvironment';
import { subscriptionBackend } from '../platform/subscriptionBackend';
import { settingsStore } from '../preferences/settingsStore';
import { profileStore } from '../preferences/profileStore';
import { createNativeNotifications } from '../notifications/createNativeNotifications';
import { createNativeJsonExport } from './NativeJsonExport';
import { createAccountBoundExport } from './AccountBoundExport';
import { RuntimeCleanupError } from '../platform/RuntimeSingleton';
import { createIncidentReportTransport } from '../support/IncidentReportClient';
import type { AuthIdentity } from '../ports/AuthPort';
import { createServerSubscriptionAdmission } from '../subscription/ServerSubscriptionAdmission';
import { resolvingSubscriptionAdmission } from '../subscription/ResolvingSubscriptionAdmission';
import { rememberAdmission } from '../subscription/rememberedAdmission';
import { createOnboardingOffer } from '../subscription/createOnboardingOffer';
import { createNativeAdAttribution } from '../ad-attribution/NativeAdAttribution';

export async function createClientServices(options: {
  extra: unknown;
  version: string;
  build: string;
  beforeDelete(): Promise<void>;
  afterDelete(): Promise<void>;
  reportError(error: unknown): void;
  promptSystem<T>(run: () => Promise<T>): Promise<T>;
  beforeAccountSwitch?(): Promise<void>;
  prepareAccount?(identity: AuthIdentity): Promise<void>;
}) {
  const config = readClientConfiguration(options.extra);
  initializeSentrySdk(config.sentryDsn, { version: options.version, build: options.build, environment: config.environment });
  let telemetry!: ReturnType<typeof createPostHogRuntime>;
  let verifiedStore: 'production' | 'sandbox' | null = null;
  let resolvingStore: Promise<'production' | 'sandbox' | null> | null = null;
  const readVerifiedEnvironment = () => {
    if (verifiedStore) return Promise.resolve(verifiedStore);
    if (!resolvingStore) resolvingStore = verifiedStoreEnvironment()
      .then((value) => { verifiedStore = value; return value; })
      .finally(() => { resolvingStore = null; });
    return resolvingStore;
  };
  const adAttribution = createNativeAdAttribution({
    tiktok: config.adAttribution.tiktok,
    productionStore: async () => {
      if (config.environment !== 'prod') return false;
      const store = await readVerifiedEnvironment();
      if (store === null) throw new Error('App Store environment unverified; TikTok waits for the next launch');
      return store === 'production';
    },
    prompt: (run) => options.promptSystem(run),
    reportError: (error) => options.reportError(error),
  });
  adAttribution.start();
  const identity = await createIdentityServices({
    adAttribution,
    config: config.auth, adaptyPublicKey: config.adaptyPublicKey, reportError: options.reportError, beforeDelete: options.beforeDelete, afterDelete: options.afterDelete,
    beforeAccountSwitch: options.beforeAccountSwitch,
    prepareAccount: options.prepareAccount,
    analyticsFactory: (getIdentity) => {
      telemetry = createPostHogRuntime(config.posthog, {
        getIdentity,
        analyticsEnabled: () => settingsStore.getState().data.analyticsEnabled,
        getContext: () => {
          const ota = getOtaObservabilityContext();
          return { environment: config.environment, runtime_version: ota.runtime_version ?? 'embedded', update_id: ota.update_id ?? 'embedded', walk_places: normalizeWalkPlaces(profileStore.getState().data.walkPlaces) ?? 'none' };
        },
      });
      return {
        track: (event, props) => telemetry.analytics.track(event, props),
        identify: (id) => telemetry.analytics.identify(id), reset: () => telemetry.analytics.reset(),
        getDistinctId: telemetry.getDistinctId,
        replayPendingScreens: () => telemetry.analytics.replayPendingScreens(),
        dispose: () => telemetry.dispose(),
      };
    },
  });
  try {
  let disposed = false;
  let disposal: Promise<void> | null = null;
  let exportOrigin: ReturnType<typeof identity.auth.identity> | null = null;
  const exporter = createNativeJsonExport(() => {
    const live = identity.auth.identity();
    return !disposed && exportOrigin !== null && live.kind !== 'deleting' && live.kind === exportOrigin.kind && live.generation === exportOrigin.generation && live.userId === exportOrigin.userId;
  });
  const notifications = createNativeNotifications(() => !disposed, () => identity.auth.identity().generation);
  const subscriptionAdmission = resolvingSubscriptionAdmission({
    resolveBackend: async () => subscriptionBackend(config, config.environment === 'prod' ? await readVerifiedEnvironment() : config.storeEnvironment),
    createAdmission: (backend) => rememberAdmission(
        createServerSubscriptionAdmission({
          apiBaseUrl: backend.apiBaseUrl,
          environment: backend.environment,
          getAuthContext: () => (disposed ? Promise.resolve(null) : identity.getAuthContext()),
          getIdentity: () => identity.auth.identity(),
          storeKitTestTransactions: backend.environment === 'sandbox' ? xcodeEntitlementTransactions : undefined,
        }),
        { environment: backend.environment, now: Date.now, identity: () => identity.auth.identity() },
      ),
  });
  identity.subscription.bindAdmission(subscriptionAdmission);
  const dataExport = createAccountBoundExport(
    () => identity.auth.identity(),
    {
      requestShare: async (payload) => {
        exportOrigin = identity.auth.identity();
        try { await exporter.requestShare(payload); }
        finally { exportOrigin = null; }
      },
    },
    () => disposed,
  );
  return {
    auth: identity.auth, subscription: identity.subscription, subscriptionAdmission, analytics: telemetry.analytics, adAttribution,
    onboardingOffer: createOnboardingOffer({ subscription: identity.subscription, analytics: telemetry.analytics, identityGeneration: () => identity.auth.identity().generation, installId: () => telemetry.getDeviceId() }),
    experiments: createPaywallExperimentPort(telemetry.analytics.flags),
    signInRequired: createSignInRequiredPort(telemetry.analytics.flags),
    onboardingFlow: createOnboardingFlowPort({
      readPayload: () => telemetry.analytics.flags.getPayload('onboarding_variant'),
      awaitReady: () =>
        identity.waitForIdentityReady({ timeoutMs: 5_000 }).then(
          () => undefined,
          () => undefined,
        ),
    }),
    reviewPreset: createReviewPresetPort(telemetry.analytics.flags), notifications,
    incidentReports: createIncidentReportTransport({
      apiBaseUrl: config.auth.apiBaseUrl,
      getAuthContext: () => (disposed ? Promise.resolve(null) : identity.getAuthContext()),
    }),
    dataExport,
    boot: identity.boot,
    waitForIdentityReady: identity.waitForIdentityReady,
    runIdentityOperation: identity.runIdentityOperation,
    dispose() {
      if (disposal) return disposal;
      disposed = true;
      subscriptionAdmission.invalidate();
      disposal = identity.dispose();
      return disposal;
    },
  };
  } catch (error) {
    try { await identity.dispose(); }
    catch (cleanupError) {
      const failures = cleanupError instanceof AggregateError ? cleanupError.errors : [cleanupError];
      throw new RuntimeCleanupError([error, ...failures]);
    }
    throw error;
  }
}
