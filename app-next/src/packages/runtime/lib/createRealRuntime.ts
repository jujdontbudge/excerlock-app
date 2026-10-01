import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Runtime } from '../../ports/Runtime';
import type { RuntimeStatusSnapshot } from '../../ports/RuntimeStatusPort';
import { suspendGymVisitLogWritesAndReset } from '../../activity/AsyncStorageGymVisitLog';
import { RuntimeSafety } from './RuntimeSafety';
import { eraseProductionData } from './eraseProductionData';
import { hydrateProductionStores } from './hydrateProductionStores';
import { createClientServices } from '@client-services';
import { createNativeDetection } from '../../activity/createNativeDetection';
import { createStrideGateConfigPort } from '../../activity/createStrideGateConfigPort';
import { NativeWalkingPort } from '../../activity/NativeWalkingPort';
import { createNativeGymPort } from '../../activity/NativeGymPort';
import { createNativeClockPort } from './NativeClockPort';
import { createNativeSupportPort } from '../../support/NativeSupportPort';
import * as StoreReview from 'expo-store-review';
import { createStoreReviewPort } from './createStoreReviewPort';
import { snapshotSensors } from '../../activity/sensorStreams';
import { createIncidentLog } from '../../support/IncidentLog';
import { buildIncidentDiagnostics } from '../../support/incidentDiagnostics';
import { createIncidentReportPort } from '../../support/createIncidentReportPort';
import { currentActivityTruth } from '../../activity/activityTruthStore';
import { nativeGait } from './NativeGait';
import { createNativeScreenTimePort, NativeScreenTimePickerHost } from '../../app-selection/createNativeScreenTimePort';
import { getExcerlockEnforcementModule } from '../../../../modules/excerlock-enforcement';
import { linkedTrace } from '@linked-trace';
import { NativeEnforcementTransport } from '../../enforcement/NativeEnforcementTransport';
import { EnforcementHost } from '../../enforcement/EnforcementHost';
import { isConditionShieldLift } from '../../enforcement/conditionShieldLift';
import { RuntimeEnforcementSource } from '../../enforcement/RuntimeEnforcementSource';
import { detectionStore } from '../../activity/detectionStore';
import { rulesStore } from '../../conditions/rulesStore';
import { ruleDaysStore } from '../../conditions/ruleDaysStore';
import { settingsStore } from '../../preferences/settingsStore';
import { permissionsStore } from '../../permissions/permissionsStore';
import { entitlementStore } from '../../subscription/entitlementStore';
import { addDays, dayKey, localDayStart } from '../../schedule/calendar';
import { currentInstances } from '../../schedule/schedule';
import { historyStore } from '../../progress/historyStore';
import { sealDays, retainRuleDays, preserveSealedRuleDays } from '../../progress/sealDay';
import { projectMeasuredHistory } from '../../progress/projectMeasuredHistory';
import {
  planStepInstanceMeasurements,
  projectInstanceProgress,
  walkingAccountingDeadlines,
  type ExactStepMeasurement,
} from '../../progress/projectInstanceProgress';
import { registerHeadlessDetectionHandler } from '../../activity/headlessRegistry';
import { createShieldCopyWriter } from '../../enforcement/createShieldCopyWriter';
import type { DetectionWake } from '../../activity/DetectionService';
import { RuntimeCleanupError } from '../../platform/RuntimeSingleton';
import { enforcementTransitionEvents, type AppliedPolicy } from '../../enforcement/enforcementAnalytics';
import type { EnforcementAppState } from '@excerlock/analytics-events';
import { markStartupStage } from '../../../../modules/excerlock-startup';
import { createAccountDataCoordinator } from '../AccountDataCoordinator';
import { isAccountDataReady } from '../../model/accountDataReady';
import { createActivityAccountData } from '../../activity/ActivityAccountData';
import { expoNotificationResponses } from '../../notifications/ExpoNotificationResponses';

const SELECTION_VERSION_KEY = 'excerlock-next.selection-version.v1';
const APP_STATES = new Set(['active', 'background', 'inactive']);
const currentAppState = (): EnforcementAppState => {
  const state: unknown = AppState.currentState;
  return typeof state === 'string' && APP_STATES.has(state) ? (state as EnforcementAppState) : 'unknown';
};
export type RealRuntime = Runtime & {
  reconcile(source?: DetectionWake['source']): Promise<void>;
  disposeAsync(): Promise<void>;
};

export async function createRealRuntime(options: { reportError(error: unknown): void }): Promise<RealRuntime> {
  await hydrateProductionStores();
  const native = getExcerlockEnforcementModule();
  const gait = nativeGait();
  if (!gait) throw new Error('The production gait module is missing');
  let selectionVersion = (await AsyncStorage.getItem(SELECTION_VERSION_KEY)) ?? 'initial';
  const clock = createNativeClockPort();
  const safety = new RuntimeSafety();
  const storeReview = createStoreReviewPort(StoreReview);
  let disposed = false;
  let stopping: Promise<void> | null = null;
  let queue: Promise<void> = Promise.resolve();
  let lastOperation: Promise<void> = queue;
  let lastPrunedDay: string | null = null;
  let instanceMeasurements: Record<string, ExactStepMeasurement> = {};
  const stops: (() => void)[] = [];
  const listeners = new Set<() => void>();
  let status: RuntimeStatusSnapshot = { hydrated: true, loading: true, history: [], shieldLifts: { confirmed: 0, source: null } };
  const cleanups: (() => void | Promise<void>)[] = [() => clock.dispose(), () => gait.stop()];
  let cleanupResult: Promise<void> | null = null;
  const cleanupResources = (): Promise<void> => {
    if (cleanupResult) return cleanupResult;
    cleanupResult = (async () => {
      const failures: unknown[] = [];
      for (const cleanup of [...cleanups].reverse()) {
        try {
          await cleanup();
        } catch (error) {
          failures.push(error);
          options.reportError(error);
        }
      }
      if (failures.length) throw new RuntimeCleanupError(failures);
    })();
    return cleanupResult;
  };
  try {
    const userWalkingGraceMs = () => settingsStore.getState().data.stopGrace * 1000;
    let readStrideGatePayload: (() => Promise<unknown>) | null = null;
    const strideGate = createStrideGateConfigPort({
      readPayload: () => readStrideGatePayload?.() ?? Promise.resolve(undefined),
      apply: (report) => detection.motion.applyStrideGateConfig(report),
      reportError: options.reportError,
    });
    const walkingGraceMs = () => strideGate.walkingGraceMs(userWalkingGraceMs());
    const wakeContext = () => {
      const now = clock.readNow(),
        timezone = clock.timezone();
      return {
        timezone,
        dayStart: Date.parse(localDayStart(dayKey(now, timezone), timezone)),
        walkingGraceMs: walkingGraceMs(),
        generation: detectionStore.getState().data.generation,
      };
    };
    const detection = createNativeDetection({
      getWakeContext: wakeContext,
      onError: options.reportError,
      registerHeadless: false,
    });
    const activityAccountData = createActivityAccountData({
      historyLedger: detection.historyLedger,
      walkingDurationLedger: detection.walkingDurationLedger,
      gymLog: detection.gymLog,
      now: () => Date.now(),
    });
    const accountData = createAccountDataCoordinator(AsyncStorage, activityAccountData);
    await accountData.prepare();
    markStartupStage('HydrationDone');
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
      walkingGraceMs,
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
    let appliedPolicy: AppliedPolicy | null = null;
    let committedGymPresence = ruleDaysStore.getState().data.gymPresence;
    let deletionSuspended = false;
    let host!: EnforcementHost;
    const rawScreenTime = createNativeScreenTimePort({
      applyLock: async () => ({ applied: (await host.reconcile()) === 'applied' }),
      registerWatchdog: async () => {
        throw new Error('Watchdog registration is owned by the runtime policy host');
      },
      cancelWatchdog: async () => {
        await host.reconcile(true);
      },
    }, {
      isDenied: () => permissionsStore.getState().data.screenTime === 'denied',
      remember: () => permissionsStore.getState().patch({ screenTime: 'denied' }),
    });
    const client = await createClientServices({
      extra: Constants.expoConfig?.extra,
      version: Constants.expoConfig?.version ?? '1.0.0',
      build: Constants.expoConfig?.ios?.buildNumber ?? '1',
      reportError: options.reportError,
      beforeAccountSwitch: async () => {
        await queue;
        walking.stop();
        await detection.service.stop();
        await detection.service.flush();
        await accountData.deactivate();
      },
      prepareAccount: async (identity) => {
        if (!identity.userId) throw new Error('Canonical account is missing its user ID');
        const transition = await accountData.activate(identity.userId);
        if (transition.changedAccount) {
          await rawScreenTime.eraseLockedSelection();
          selectionVersion = `account:${identity.generation}:${Date.now()}`;
          await AsyncStorage.setItem(SELECTION_VERSION_KEY, selectionVersion);
          rulesStore.getState().patch({ lockedApps: { handle: null, isEmpty: true } });
          await rulesStore.persistBarrier();
          await accountData.save();
        }
        stepsByDay = {};
        instanceMeasurements = {};
        lastPrunedDay = null;
        regionsSignature = null;
        committedWalking = walking.snapshot();
        committedGymPresence = null;
      },
      beforeDelete: async () => {
        deletionSuspended = true;
        await queue;
        await host.reconcile(true);
        walking.stop();
        await safety.stopCamera(() => gait.stop());
        const awake = await detection.awake.reconcile(false);
        if (awake.error) throw new Error(awake.error);
        await detection.location.stopMonitoringRegions();
        await detection.service.stop();
        await detection.service.flush();
        regionsSignature = null;
      },
      afterDelete: async () => {
        await queue;
        await suspendGymVisitLogWritesAndReset();
        await rawScreenTime.eraseLockedSelection();
        await eraseProductionData({
          historyLedger: detection.historyLedger,
          gymLog: detection.gymLog,
          permissions: permissionsStore.getState().data,
        });
        await Promise.all(
          ['trial_ending', 'open_to_unlock', 'shield_open'].map((id) => client.notifications.cancel(id)),
        );
        selectionVersion = `deleted:${Date.now()}`;
        await AsyncStorage.setItem(SELECTION_VERSION_KEY, selectionVersion);
        await detection.walkingDurationLedger.reset();
        stepsByDay = {};
        instanceMeasurements = {};
        lastPrunedDay = null;
        committedWalking = walking.snapshot();
        committedGymPresence = null;
        status = { ...status, history: [] };
        await accountData.eraseActive();
        listeners.forEach((listener) => listener());
      },
    });
    cleanups.push(() => client.dispose());
    readStrideGatePayload = () => client.analytics.flags.getPayload('stride_gate_config');
    const shieldCopy = createShieldCopyWriter({
      readPayload: () => client.analytics.flags.getPayload('shield_copy'),
      write: (json) => native.setShieldCopyOverrides(json),
      isForeground: () => AppState.currentState === 'active',
      reportError: options.reportError,
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
        deleting: deletionSuspended || client.auth.identity().kind === 'deleting',
        accountGeneration: client.auth.identity().generation,
        accountReady: isAccountDataReady(client.auth.identity(), accountData.snapshot().activeUserId),
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
    const incidentLog = createIncidentLog();
    let lastEnforcement: ReturnType<typeof source.read> | null = null;
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
          const opportunitySource = __LINKED_RECORDER_TRACE__ ? `runtime_${wakeSource}_${mode}` : '';
          if (__LINKED_RECORDER_TRACE__)
            linkedTrace.record('execution_opportunity', { source: opportunitySource, status: 'received' });
          if (deletionSuspended) {
            await host.reconcile(true);
            if (__LINKED_RECORDER_TRACE__)
              linkedTrace.record('execution_opportunity', { source: opportunitySource, status: 'completed' });
            return;
          }
          const now = Date.now();
          let opportunityStatus = 'failed';
          insideReconcile = true;
          try {
            const motion = detection.steps.authorizationStatus();
            const deleting = client.auth.identity().kind === 'deleting';
            if (mode === 'full') {
              if (wakeSource === 'foreground') await detection.location.refreshAuthorization().catch(() => undefined);
              await ruleDaysStore.retryPersistence();
              await historyStore.retryPersistence();
              if (!deleting && motion === 'granted') await detection.start(wakeContext().walkingGraceMs);
              const regionPlan =
                !deleting &&
                gym.authorizationStatus() === 'authorizedAlways' &&
                settingsStore.getState().data.gymAutoDetect
                  ? settingsStore.getState().data.gymPlaces
                  : [];
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
            if (mode === 'full') {
              if (motion === 'granted' && !deleting) {
                const ranges = planStepInstanceMeasurements(
                  rulesStore.getState().data.rules,
                  new Date(now).toISOString(),
                  clock.timezone(),
                  new Set(historyStore.getState().data.days.map((row) => row.day)),
                );
                await detection.service.measureStepRanges(ranges, detectionStore.getState().data.generation);
              }
              const ledger = await detection.historyLedger.read();
              stepsByDay = ledger.stepsByDay;
              instanceMeasurements = ledger.instanceMeasurements;
            }
            if (disposed) return;
            const previous = ruleDaysStore.getState().data.days;
            const duration = await detection.walkingDurationLedger.read();
            const detected = detection.snapshot();
            const configured = settingsStore.getState().data.gymPlaces.map((place) => place.id);
            const rows = projectInstanceProgress(
              rulesStore.getState().data.rules,
              previous,
              instanceMeasurements,
              duration.segments,
              detected.gym.intervals,
              configured,
              clock.timezone(),
              new Date(now).toISOString(),
              new Set(historyStore.getState().data.days.map((row) => row.day)),
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
            const oldArchive = historyStore.getState().data;
            const measuredHistory = projectMeasuredHistory(
              stepsByDay,
              detected.gym.intervals,
              configured,
              rulesStore.getState().data.rules,
              rows,
              clock.timezone(),
              new Date(now).toISOString(),
              new Set(oldArchive.days.map((row) => row.day)),
            );
            const archive = sealDays(
              oldArchive,
              measuredHistory,
              rulesStore.getState().data.rules,
              clock.timezone(),
              new Date(now).toISOString(),
              walkingAccountingDeadlines(
                rulesStore.getState().data.rules,
                duration.segments,
                new Date(now).toISOString(),
                duration.cursor?.verified ? duration.cursor.timezone : undefined,
              ),
            );
            const finalRows = preserveSealedRuleDays(previous, rows, oldArchive);
            projecting = true;
            try {
              if (JSON.stringify(finalRows) !== JSON.stringify(ruleDaysStore.getState().data.days))
                ruleDaysStore.getState().patch({ days: finalRows });
            } finally {
              projecting = false;
            }
            await ruleDaysStore.persistBarrier();
            if (JSON.stringify(archive) !== JSON.stringify(oldArchive)) historyStore.getState().patch(archive);
            await historyStore.persistBarrier();
            const today = dayKey(new Date(now).toISOString(), clock.timezone());
            const retainedRows = retainRuleDays(previous, rows, oldArchive, today);
            const sealedKeys = new Set(archive.days.map((row) => row.day));
            const history = [...archive.days, ...measuredHistory.filter((row) => !sealedKeys.has(row.day))].sort(
              (a, b) => a.day.localeCompare(b.day),
            );
            if (JSON.stringify(history) !== JSON.stringify(status.history)) {
              status = { ...status, history };
              listeners.forEach((listener) => listener());
            }
            committedGymPresence = gymPresence;
            projecting = true;
            try {
              if (JSON.stringify(gymPresence) !== JSON.stringify(ruleDaysStore.getState().data.gymPresence))
                ruleDaysStore.getState().patch({ gymPresence });
              if (JSON.stringify(retainedRows) !== JSON.stringify(ruleDaysStore.getState().data.days))
                ruleDaysStore.getState().patch({ days: retainedRows });
            } finally {
              projecting = false;
            }
            await ruleDaysStore.persistBarrier();
            if (duration.generation !== null && duration.pending.length)
              await detection.walkingDurationLedger.acknowledge(
                duration.pending.map((intent) => intent.idempotencyKey),
                duration.generation,
              );
            const retentionDay = addDays(today, -399);
            if (lastPrunedDay === null || retentionDay > lastPrunedDay) {
              const cutoffMs = Date.parse(localDayStart(retentionDay, clock.timezone()));
              await detection.historyLedger.pruneBeforeDay(retentionDay);
              await detection.walkingDurationLedger.pruneBeforeDay(retentionDay);
              await detection.gymLog.pruneBefore(cutoffMs);
              await detection.service.pruneGymHistory(cutoffMs, detectionStore.getState().data.generation);
              stepsByDay = Object.fromEntries(Object.entries(stepsByDay).filter(([day]) => day >= retentionDay));
              lastPrunedDay = retentionDay;
            }
            if (
              AppState.currentState !== 'active' &&
              permissionsStore.getState().data.location !== 'always' &&
              rows.some(
                (row) =>
                  row.met &&
                  !previous.some((old) => old.ruleId === row.ruleId && old.day === row.day && old.met) &&
                  rulesStore
                    .getState()
                    .data.rules.some(
                      (rule) => rule.id === row.ruleId && rule.activity === 'walking' && rule.mode.kind === 'target',
                    ),
              )
            ) {
              if (settingsStore.getState().data.notificationsEnabled)
                void client.notifications.scheduleOpenToUnlock().catch(options.reportError);
            }
            const snapshot = source.read();
            lastEnforcement = snapshot;
            if (
              snapshot.scheduleIssue &&
              JSON.stringify(status.scheduleIssue) !== JSON.stringify(snapshot.scheduleIssue)
            ) {
              status = { ...status, scheduleIssue: snapshot.scheduleIssue };
              listeners.forEach((listener) => listener());
            }
            const awake = await detection.awake.reconcile(
              snapshot.state === 'shield' || snapshot.state === 'conditional',
            );
            if (awake.error) options.reportError(new Error(awake.error));
            let applied: Awaited<ReturnType<typeof host.reconcile>>;
            try {
              applied = await host.reconcile(wakeSource !== 'manual');
            } catch (error) {
              incidentLog.record({
                at: new Date().toISOString(),
                state: snapshot.state,
                openReason: snapshot.openReason ?? null,
                relief: snapshot.state === 'conditional' ? snapshot.relief : null,
                result: 'failed',
              });
              throw error;
            }
            incidentLog.record({
              at: new Date().toISOString(),
              state: snapshot.state,
              openReason: snapshot.openReason ?? null,
              relief: snapshot.state === 'conditional' ? snapshot.relief : null,
              result: applied,
            });
            if (applied === 'applied' && source.read().revision === snapshot.revision) {
              for (const event of enforcementTransitionEvents(appliedPolicy, snapshot, { appState: currentAppState(), source: wakeSource })) {
                if (event.name === 'unlock_completed') client.analytics.track('unlock_completed', event.props);
                else if (event.name === 'shields_lifted') client.analytics.track('shields_lifted', event.props);
                else client.analytics.track('shields_applied', event.props);
              }
              const nextPolicy = { state: snapshot.state, relief: snapshot.relief, openReason: snapshot.openReason };
              if (isConditionShieldLift(appliedPolicy, nextPolicy)) {
                status = { ...status, shieldLifts: { confirmed: (status.shieldLifts?.confirmed ?? 0) + 1, source: wakeSource } };
                listeners.forEach((listener) => listener());
              }
              appliedPolicy = nextPolicy;
            }
            if (
              applied === 'applied' &&
              !snapshot.scheduleIssue &&
              status.scheduleIssue &&
              source.read().revision === snapshot.revision
            ) {
              status = { ...status, scheduleIssue: undefined };
              listeners.forEach((listener) => listener());
            }
            opportunityStatus = 'completed';
          } finally {
            if (__LINKED_RECORDER_TRACE__)
              linkedTrace.record('execution_opportunity', { source: opportunitySource, status: opportunityStatus });
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
      listeners.clear();
      stopping = (async () => {
        const cleanupFailures: unknown[] = [];
        let operationError: unknown;
        for (const stop of stops.splice(0)) {
          try {
            stop();
          } catch (error) {
            cleanupFailures.push(error);
            options.reportError(error);
          }
        }
        try {
          host.dispose();
        } catch (error) {
          cleanupFailures.push(error);
          options.reportError(error);
        }
        try {
          await queue;
        } catch (error) {
          operationError = error;
        }
        try {
          await accountData.save();
        } catch (error) {
          cleanupFailures.push(error);
          options.reportError(error);
        }
        try {
          await cleanupResources();
        } catch (error) {
          if (error instanceof RuntimeCleanupError) cleanupFailures.push(...error.failures);
          else cleanupFailures.push(error);
        }
        if (cleanupFailures.length) throw new RuntimeCleanupError(cleanupFailures);
        if (operationError !== undefined) throw operationError;
      })();
      return stopping;
    };
    const runtime: RealRuntime = {
      kind: 'real',
      clock,
      gait: {
        ...gait,
        start: () => safety.startCamera(() => gait.start()),
        stop: () => safety.stopCamera(() => gait.stop()),
        permission: async () => {
          const camera = await safety.prompt(() => gait.permission());
          permissionsStore.getState().patch({ camera });
          return camera;
        },
      },
      safety: safety.read,
      gym: {
        ...gym,
        enableAutoDetect: () => safety.prompt(() => gym.enableAutoDetect()),
        requestLocation: async () => {
          const permission = await safety.prompt(() => gym.requestLocation());
          permissionsStore.getState().patch({ location: permission });
          await reconcile();
          return permission;
        },
        requestBackgroundLocation: async () => {
          const permission = await safety.prompt(() => gym.requestBackgroundLocation());
          permissionsStore.getState().patch({ location: permission });
          await reconcile();
          return permission;
        },
      },
      walking,
      steps: {
        authorizationStatus: () => detection.steps.authorizationStatus(),
        stepsSince: (day) => detection.steps.stepsSince(day),
        stepsBetween: (from, to) => detection.steps.stepsBetween(from, to),
        metricsBetween: (from, to) => detection.steps.metricsBetween(from, to),
        subscribe: (cb) => detection.steps.subscribe(cb),
        request: async () => {
          const permission = await safety.prompt(() => detection.steps.request());
          permissionsStore.getState().patch({ motion: permission });
          await reconcile();
          return permission;
        },
      },
      support: createNativeSupportPort(),
      sensors: detection.sensors,
      review: {
        ...storeReview,
        requestReview: () => safety.prompt(() => storeReview.requestReview()),
      },
      incidentReports: createIncidentReportPort({
        transport: client.incidentReports,
        app: {
          version: Constants.expoConfig?.version ?? '1.0.0',
          build: Constants.expoConfig?.ios?.buildNumber ?? '1',
          osVersion: String(Platform.Version),
        },
        collect: async () => {
          await incidentLog.ready();
          const duration = await detection.walkingDurationLedger.read();
          return buildIncidentDiagnostics({
            now: Date.now(),
            timezone: clock.timezone(),
            enforcement: lastEnforcement,
            walking: walking.snapshot(),
            walkingDetails: walking.details(),
            detection: detection.snapshot(),
            gymPresence: committedGymPresence,
            gymAutoDetect: settingsStore.getState().data.gymAutoDetect,
            savedGyms: settingsStore.getState().data.gymPlaces.length,
            permissions: permissionsStore.getState().data,
            rules: rulesStore.getState().data.rules,
            lockedApps: rulesStore.getState().data.lockedApps,
            ruleDays: ruleDaysStore.getState().data.days,
            entitlement: client.subscription.entitlement(),
            identity: client.auth.identity(),
            stopGraceSeconds: settingsStore.getState().data.stopGrace,
            notificationsEnabled: settingsStore.getState().data.notificationsEnabled,
            walkingDuration: duration,
            events: incidentLog.read(),
            activityTruth: currentActivityTruth(Date.now()),
            sensors: snapshotSensors(detection.sensors),
          });
        },
      }),
      auth: client.auth,
      subscription: client.subscription,
      subscriptionAdmission: client.subscriptionAdmission,
      analytics: client.analytics,
      reviewPreset: client.reviewPreset,
      experiments: client.experiments,
      signInRequired: client.signInRequired,
      onboardingFlow: client.onboardingFlow,
      shieldCopy,
      strideGate,
      notifications: { ...client.notifications, request: () => safety.prompt(() => client.notifications.request()) },
      notificationResponses: expoNotificationResponses,
      dataExport: { requestShare: (payload) => safety.prompt(() => client.dataExport.requestShare(payload)) },
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
      appPickerHost: NativeScreenTimePickerHost,
      screenTime: {
        ...rawScreenTime,
        requestAuthorization: async () => {
          const permission = await safety.prompt(() => rawScreenTime.requestAuthorization());
          permissionsStore.getState().patch({ screenTime: permission });
          request();
          return permission;
        },
        presentAppPicker: async () => {
          const selection = await safety
            .prompt(() => rawScreenTime.presentAppPicker())
            .finally(() => permissionsStore.getState().patch({ screenTime: rawScreenTime.authorizationStatus() }));
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
      await client.boot();
      if (client.auth.identity().kind !== 'deleting') deletionSuspended = false;
      await reconcile('foreground');
      stops.push(
        rulesStore.subscribe(request),
        settingsStore.subscribe(request),
        ruleDaysStore.subscribe(request),
        permissionsStore.subscribe(request),
        entitlementStore.subscribe(request),
        client.auth.subscribeIdentity((identity) => {
          if (identity.kind !== 'deleting') deletionSuspended = false;
          request();
        }),
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
      markStartupStage('RuntimeReady');
      return runtime;
    } catch (error) {
      try {
        await disposeAsync();
      } catch (cleanupError) {
        if (cleanupError instanceof RuntimeCleanupError) {
          throw new RuntimeCleanupError([error, ...cleanupError.failures]);
        }
        throw cleanupError;
      }
      throw error;
    }
  } catch (error) {
    try {
      await cleanupResources();
    } catch (cleanupError) {
      if (error instanceof RuntimeCleanupError) throw error;
      if (cleanupError instanceof RuntimeCleanupError) {
        throw new RuntimeCleanupError([error, ...cleanupError.failures]);
      }
      throw cleanupError;
    }
    throw error;
  }
}
