import { createIdentityServices } from './createIdentityServices';
import { createPostHogRuntime } from '@posthog-runtime';
import {
  createPaywallExperimentPort,
  createReviewPresetPort,
  createSignInRequiredPort,
  normalizeWalkPlaces,
} from './analytics/PostHogAnalyticsAdapter';
import { createOnboardingFlowPort } from '../onboarding/flowOrder';
import { initializeSentrySdk } from '@sentry-binding';
import { getOtaObservabilityContext } from './updates';
import { readClientConfiguration } from './clientConfiguration';
import { settingsStore } from '../state/settingsStore';
import { profileStore } from '../state/profileStore';
import { createNativeNotifications } from './notifications/createNativeNotifications';
import { createNativeJsonExport } from './NativeJsonExport';
import { createAccountBoundExport } from './AccountBoundExport';
import { RuntimeCleanupError } from './RuntimeSingleton';
import { createIncidentReportTransport } from './incident/IncidentReportClient';

/** Real client services; root must hydrate stores before construction and supply native deletion cleanup. */
export async function createClientServices(options: {
  extra: unknown;
  version: string;
  build: string;
  beforeDelete(): Promise<void>;
  afterDelete(): Promise<void>;
  reportError(error: unknown): void;
}) {
  const config = readClientConfiguration(options.extra);
  initializeSentrySdk(config.sentryDsn, { version: options.version, build: options.build, environment: config.environment });
  let telemetry!: ReturnType<typeof createPostHogRuntime>;
  const identity = await createIdentityServices({
    config: config.auth, adaptyPublicKey: config.adaptyPublicKey, reportError: options.reportError, beforeDelete: options.beforeDelete, afterDelete: options.afterDelete,
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
    auth: identity.auth, subscription: identity.subscription, analytics: telemetry.analytics,
    experiments: createPaywallExperimentPort(telemetry.analytics.flags),
    signInRequired: createSignInRequiredPort(telemetry.analytics.flags),
    // The flow rail reads once per app run. A fresh install reads it before the
    // identity spine has settled, so the port waits for the same canonical-ready
    // gate the rest of the app uses (bounded) and reads once more; onboarding
    // itself never waits — it paints the bundled order until this settles.
    onboardingFlow: createOnboardingFlowPort({
      readPayload: () => telemetry.analytics.flags.getPayload('onboarding_variant'),
      awaitReady: () =>
        identity.waitForIdentityReady({ timeoutMs: 5_000 }).then(
          () => undefined,
          () => undefined,
        ),
    }),
    reviewPreset: createReviewPresetPort(telemetry.analytics.flags), notifications,
    // Incident reports ride the same bearer as PUT /v1/user; the adapter decides whether a token may leave.
    incidentReports: createIncidentReportTransport({
      apiBaseUrl: config.auth.apiBaseUrl,
      getAuthContext: () => (disposed ? Promise.resolve(null) : identity.getAuthContext()),
    }),
    // Snapshot account before file writing. Payload assembly must also bind its origin.
    dataExport,
    boot: identity.boot,
    waitForIdentityReady: identity.waitForIdentityReady,
    runIdentityOperation: identity.runIdentityOperation,
    dispose() {
      if (disposal) return disposal;
      disposed = true;
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
