import { AppState } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Runtime } from './Runtime';
import type { RuntimeStatusSnapshot } from '../ports/RuntimeStatusPort';
import { hydrateProductionStores } from './hydrateProductionStores';
import { createClientServices } from './createClientServices';
import { createNativeDetection } from './detection/createNativeDetection';
import { NativeWalkingPort } from './detection/NativeWalkingPort';
import { createNativeGymPort } from './detection/NativeGymPort';
import { createNativeClockPort } from './NativeClockPort';
import { createNativeSupportPort } from './NativeSupportPort';
import { nativeGait } from './NativeGait';
import { createNativeScreenTimePort } from '../screentime/native/createNativeScreenTimePort';
import { getExcerlockEnforcementModule } from '../../modules/excerlock-enforcement';
import { NativeEnforcementTransport } from './enforcement/native/NativeEnforcementTransport';
import { EnforcementHost } from './enforcement/EnforcementHost';
import { RuntimeEnforcementSource } from './enforcement/RuntimeEnforcementSource';
import { detectionStore } from '../state/detectionStore';
import { rulesStore } from '../state/rulesStore';
import { ruleDaysStore } from '../state/ruleDaysStore';
import { settingsStore } from '../state/settingsStore';
import { permissionsStore } from '../state/permissionsStore';
import { entitlementStore } from '../state/entitlementStore';
import { dayKey, localInstant } from '../domain/calendar';
import { currentInstances } from '../domain/schedule';
import { projectGymHistory } from '../domain/projectGymHistory';
import { registerHeadlessDetectionHandler } from './detection/headlessRegistry';
import { projectStepHistory } from '../domain/projectStepHistory';
import type { DetectionWake } from './detection/DetectionService';

const SELECTION_VERSION_KEY = 'excerlock-next.selection-version.v1';
export type RealRuntime = Runtime & {
  reconcile(source?: DetectionWake['source']): Promise<void>;
  disposeAsync(): Promise<void>;
};

/** Actual native graph. Async by design: no service can consume default stores
 * before hydration. UI and headless bootstrap must share ONE returned instance.
 * Root mounting is kept separate from graph construction for cold task launches.
 */
export async function createRealRuntime(options: { reportError(error: unknown): void }): Promise<RealRuntime> {
  await hydrateProductionStores();
  const native = getExcerlockEnforcementModule();
  const gait = nativeGait();
  if (!gait) throw new Error('The production gait module is missing');
  let selectionVersion = (await AsyncStorage.getItem(SELECTION_VERSION_KEY)) ?? 'initial';
  const clock = createNativeClockPort();
  let disposed = false;
  let stopping: Promise<void> | null = null;
  let queue: Promise<void> = Promise.resolve();
  let lastOperation: Promise<void> = queue;
  const stops: (() => void)[] = [];
  const listeners = new Set<() => void>();
  let status: RuntimeStatusSnapshot = { hydrated: true, loading: true, history: [] };
  const cleanups: (() => void | Promise<void>)[] = [() => clock.dispose(), () => gait.stop()];
  let cleaned = false;
  const cleanupResources = async () => {
    if (cleaned) return;
    cleaned = true;
    // Continue releasing independent resources even when one native stop fails.
    for (const cleanup of cleanups.reverse()) {
      try {
        await cleanup();
      } catch (error) {
        options.reportError(error);
      }
    }
  };
  try {
    const wakeContext = () => {
      const now = clock.readNow(),
        timezone = clock.timezone();
      return {
        timezone,
        dayStart: Date.parse(localInstant(dayKey(now, timezone), 0, timezone)),
        walkingGraceMs: settingsStore.getState().data.stopGrace * 1000,
        generation: detectionStore.getState().data.generation,
      };
    };
    const detection = createNativeDetection({
      getWakeContext: wakeContext,
      onError: options.reportError,
      registerHeadless: false,
    });
    cleanups.push(
      () => detection.stop(),
      async () => {
        await detection.awake.reconcile(false);
      },
    );
    const walking = new NativeWalkingPort({
      service: detection.service,
      motion: detection.motion,
      placement: detection.placement,
      walkingGraceMs: () => settingsStore.getState().data.stopGrace * 1000,
      resolveRuleId: () =>
        rulesStore
          .getState()
          .data.rules.find(
            (r) =>
              r.enabled && r.mode.kind === 'state' && currentInstances(r, clock.readNow(), clock.timezone()).length,
          )?.id ?? null,
      onError: options.reportError,
    });
    let committedWalking = walking.snapshot();
    let committedGymPresence = ruleDaysStore.getState().data.gymPresence;
    let host!: EnforcementHost;
    const client = createClientServices({
      extra: Constants.expoConfig?.extra,
      version: Constants.expoConfig?.version ?? '1.0.0',
      build: Constants.expoConfig?.ios?.buildNumber ?? '1',
      reportError: options.reportError,
      beforeDelete: async () => {
        // Auth owns deletion state before invoking this hook. Publish suppression
        // and clear shields BEFORE stopping tracking; keep auth intact for retries.
        await host.reconcile(true);
        await detection.awake.reconcile(false);
        await detection.location.stopMonitoringRegions();
        await detection.service.stop();
        regionsSignature = null;
      },
    });
    cleanups.push(() => client.dispose());
    const rawScreenTime = createNativeScreenTimePort({
      applyLock: async () => ({ applied: (await host.reconcile()) === 'applied' }),
      registerWatchdog: async () => {
        throw new Error('Watchdog registration is owned by the runtime policy host');
      },
      cancelWatchdog: async () => {
        await host.reconcile(true);
      },
    });
    const source = new RuntimeEnforcementSource(
      () => ({
        now: clock.readNow(),
        timezone: clock.timezone(),
        rules: rulesStore.getState().data.rules,
        ruleDays: ruleDaysStore.getState().data.days,
        walking: committedWalking,
        gymPresence: committedGymPresence,
        entitlement: client.subscription.entitlement(),
        deleting: client.auth.identity().kind === 'deleting',
        accountGeneration: client.auth.identity().generation,
        screenTimeAuthorized: rawScreenTime.authorizationStatus() === 'granted',
        selection: rulesStore.getState().data.lockedApps,
        selectionVersion,
      }),
      native.getPolicyRevision(),
    );
    host = new EnforcementHost({
      read: source.read,
      transport: new NativeEnforcementTransport(native),
      report: options.reportError,
    });
    cleanups.push(() => host.dispose());
    const gym = createNativeGymPort(detection);
    let insideReconcile = false;
    let projecting = false;
    let stepsByDay: Record<string, number> = {};
    let regionsSignature: string | null = null;
    const reconcile = (
      wakeSource: DetectionWake['source'] = 'manual',
      mode: 'full' | 'tick' | 'committed' = 'full',
    ): Promise<void> => {
      const work = queue
        .catch(() => undefined)
        .then(async () => {
          if (disposed) throw new Error('Runtime disposed');
          const now = Date.now();
          insideReconcile = true;
          try {
            const motion = detection.steps.authorizationStatus();
            const deleting = client.auth.identity().kind === 'deleting';
            if (mode === 'full') {
              if (!deleting && motion === 'granted') await detection.start(wakeContext().walkingGraceMs);
              const regionPlan =
                !deleting && settingsStore.getState().data.gymAutoDetect ? settingsStore.getState().data.gymPlaces : [];
              const signature = JSON.stringify(regionPlan);
              if (signature !== regionsSignature) {
                if (regionPlan.length) await detection.registerGyms(regionPlan);
                else await detection.location.stopMonitoringRegions();
                regionsSignature = signature;
              }
              const location = gym.authorizationStatus();
              const permissions = {
                screenTime: rawScreenTime.authorizationStatus(),
                motion,
                location:
                  location === 'authorizedAlways'
                    ? ('always' as const)
                    : location === 'authorizedWhenInUse'
                      ? ('whenInUse' as const)
                      : location === 'denied' || location === 'restricted'
                        ? ('denied' as const)
                        : ('notDetermined' as const),
              };
              if (
                Object.entries(permissions).some(
                  ([key, value]) => permissionsStore.getState().data[key as keyof typeof permissions] !== value,
                )
              ) {
                projecting = true;
                try {
                  permissionsStore.getState().patch(permissions);
                } finally {
                  projecting = false;
                }
              }
              await detection.reconcileWake({
                ...wakeContext(),
                now,
                source: wakeSource,
                includeStepHistory: motion === 'granted',
              });
            } else if (mode === 'tick')
              await detection.service.tick(now, wakeContext().walkingGraceMs, wakeContext().generation);
            else await detection.service.flush();
            if (disposed) return;
            if (mode === 'full') stepsByDay = (await detection.historyLedger.read()).stepsByDay;
            if (disposed) return;
            const previous = ruleDaysStore.getState().data.days;
            const stepRows = projectStepHistory(
              rulesStore.getState().data.rules,
              previous,
              stepsByDay,
              clock.timezone(),
              new Date(now).toISOString(),
            );
            const detected = detection.snapshot();
            const configured = settingsStore.getState().data.gymPlaces.map((place) => place.id);
            const rows = projectGymHistory(
              rulesStore.getState().data.rules,
              stepRows,
              detected.gym.intervals,
              configured,
              clock.timezone(),
              new Date(now).toISOString(),
            );
            const confirmedId = configured.find((id) => detected.gym.regions[id]?.confirmedSince != null);
            const since = confirmedId ? detected.gym.regions[confirmedId].confirmedSince : null;
            const gymPresence =
              confirmedId && since != null
                ? {
                    placeId: confirmedId,
                    startedAt: new Date(since).toISOString(),
                    confirmedAt: new Date(since).toISOString(),
                  }
                : null;
            committedGymPresence = gymPresence;
            projecting = true;
            try {
              if (JSON.stringify(gymPresence) !== JSON.stringify(ruleDaysStore.getState().data.gymPresence))
                ruleDaysStore.getState().patch({ gymPresence });
              if (JSON.stringify(rows) !== JSON.stringify(previous)) ruleDaysStore.getState().patch({ days: rows });
            } finally {
              projecting = false;
            }
            const snapshot = source.read();
            const awake = await detection.awake.reconcile(
              snapshot.state === 'shield' || snapshot.state === 'conditional',
            );
            if (awake.error) options.reportError(new Error(awake.error));
            await host.reconcile(wakeSource !== 'manual');
          } finally {
            insideReconcile = false;
          }
        });
      lastOperation = work;
      queue = work.catch(() => undefined);
      return work;
    };
    const request = () => {
      if (!disposed && !projecting) void reconcile().catch(options.reportError);
    };
    const disposeAsync = (): Promise<void> => {
      if (stopping) return stopping;
      disposed = true;
      stops.splice(0).forEach((stop) => stop());
      host.dispose();
      clock.dispose();
      listeners.clear();
      stopping = (async () => {
        await queue;
        await cleanupResources();
      })();
      return stopping;
    };
    const runtime: RealRuntime = {
      kind: 'real',
      clock,
      gait,
      gym: {
        ...gym,
        requestLocation: async () => {
          const permission = await gym.requestLocation();
          permissionsStore.getState().patch({ location: permission });
          await reconcile();
          return permission;
        },
      },
      walking,
      steps: {
        authorizationStatus: () => detection.steps.authorizationStatus(),
        stepsSince: (day) => detection.steps.stepsSince(day),
        subscribe: (cb) => detection.steps.subscribe(cb),
        request: async () => {
          const permission = await detection.steps.request();
          permissionsStore.getState().patch({ motion: permission });
          await reconcile();
          return permission;
        },
      },
      support: createNativeSupportPort(),
      auth: client.auth,
      subscription: client.subscription,
      analytics: client.analytics,
      notifications: client.notifications,
      dataExport: client.dataExport,
      // No rules-sync endpoint exists yet. Never acknowledge imaginary cloud writes.
      sync: {
        pushRules: async () => {
          throw new Error('Cloud rules synchronization is unavailable');
        },
        pushRuleDays: async () => {
          throw new Error('Cloud history synchronization is unavailable');
        },
        pull: async () => {
          throw new Error('Cloud synchronization is unavailable');
        },
      },
      screenTime: {
        ...rawScreenTime,
        requestAuthorization: async () => {
          const permission = await rawScreenTime.requestAuthorization();
          permissionsStore.getState().patch({ screenTime: permission });
          request();
          return permission;
        },
        presentAppPicker: async () => {
          const selection = await rawScreenTime.presentAppPicker();
          selectionVersion = `${Date.now()}:${native.getPolicyRevision() + 1}`;
          await AsyncStorage.setItem(SELECTION_VERSION_KEY, selectionVersion);
          rulesStore.getState().patch({ lockedApps: selection });
          await reconcile();
          return selection;
        },
      },
      status: {
        ready: async () => {
          await lastOperation;
        },
        flush: async () => {
          await lastOperation;
        },
        snapshot: () => status,
        subscribe: (callback) => {
          listeners.add(callback);
          return () => {
            listeners.delete(callback);
          };
        },
      },
      reconcile,
      disposeAsync,
      dispose: () => {
        void disposeAsync().catch(options.reportError);
      },
    };
    try {
      stops.push(
        detection.service.observeCommitted(() => {
          committedWalking = walking.snapshot();
          const data = detection.snapshot();
          const id = settingsStore
            .getState()
            .data.gymPlaces.map((place) => place.id)
            .find((id) => data.gym.regions[id]?.confirmedSince != null);
          const at = id ? data.gym.regions[id].confirmedSince : null;
          committedGymPresence =
            id && at != null
              ? { placeId: id, startedAt: new Date(at).toISOString(), confirmedAt: new Date(at).toISOString() }
              : null;
          if (!disposed && !insideReconcile) void reconcile('manual', 'committed').catch(options.reportError);
        }),
      );
      // Starting auth is bounded by its own provisional/offline boot contract.
      await client.boot();
      await reconcile('foreground');
      stops.push(
        rulesStore.subscribe(request),
        settingsStore.subscribe(request),
        ruleDaysStore.subscribe(request),
        permissionsStore.subscribe(request),
        entitlementStore.subscribe(request),
        client.auth.subscribeIdentity(request),
      );
      const appState = AppState.addEventListener('change', (state) => {
        void reconcile(state === 'active' ? 'foreground' : 'background', state === 'active' ? 'full' : 'tick').catch(
          options.reportError,
        );
      });
      stops.push(
        () => appState.remove(),
        clock.subscribe(() => {
          void reconcile('manual', 'tick').catch(options.reportError);
        }),
      );
      stops.push(
        registerHeadlessDetectionHandler(async () => {
          await reconcile('geofence');
        }),
      );
      status = { ...status, loading: false };
      listeners.forEach((listener) => listener());
      return runtime;
    } catch (error) {
      await disposeAsync().catch(options.reportError);
      throw error;
    }
  } catch (error) {
    await cleanupResources();
    throw error;
  }
}
