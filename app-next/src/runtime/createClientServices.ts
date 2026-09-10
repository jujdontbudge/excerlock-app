import { createIdentityServices } from './createIdentityServices';
import { createPostHogRuntime } from './analytics/createPostHogRuntime';
import { createPaywallExperimentPort, normalizeWalkPlaces } from './analytics/PostHogAnalyticsAdapter';
import { initializeSentrySdk } from './observability/SentryBinding';
import { getOtaObservabilityContext } from './updates';
import { readClientConfiguration } from './clientConfiguration';
import { settingsStore } from '../state/settingsStore';
import { profileStore } from '../state/profileStore';
import { createNativeNotifications } from './notifications/createNativeNotifications';
import { createNativeJsonExport } from './NativeJsonExport';
import { createAccountBoundExport } from './AccountBoundExport';

/** Real client services; root must hydrate stores before construction and supply native deletion cleanup. */
export function createClientServices(options: {
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
  const identity = createIdentityServices({
    config: config.auth, adaptyPublicKey: config.adaptyPublicKey, beforeDelete: options.beforeDelete, afterDelete: options.afterDelete,
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
        dispose: () => { void telemetry.dispose().catch(options.reportError); },
      };
    },
  });
  let disposed = false;
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
    experiments: createPaywallExperimentPort(telemetry.analytics.flags), notifications,
    // Snapshot account before file writing. Payload assembly must also bind its origin.
    dataExport,
    boot: identity.boot,
    waitForIdentityReady: identity.waitForIdentityReady,
    runIdentityOperation: identity.runIdentityOperation,
    dispose() { if (disposed) return; disposed = true; identity.dispose(); },
  };
}
