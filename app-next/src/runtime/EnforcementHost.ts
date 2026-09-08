import { resolveLock } from '../domain/resolveLock';
import { entitlementStore } from '../state/entitlementStore';
import { enforcementStore } from '../state/enforcementStore';
import { ruleDaysStore } from '../state/ruleDaysStore';
import { rulesStore } from '../state/rulesStore';
import { permissionsStore } from '../state/permissionsStore';
import { Unsubscribe } from '../ports/models';
import { Runtime } from './Runtime';
import { enforcementPlan, EnforcementPlan } from '../domain/enforcement';
import { effectiveNow, nextWatermark } from '../domain/watermark';
import { compileMonitorPlan } from '../domain/monitorPlan';
import { mergedLockIntervals } from '../domain/lockIntervals';
import { Entitlement } from '../domain/types';
import { createProgressSync } from '../features/home/progressSync';
import { startSessionGuard } from './sessionGuard';
import { addDays } from '../domain/calendar';
import { dayKey, windowInstances } from '../domain/schedule';
import { nextEnforcementAt } from './nextEnforcementAt';
import { AppStateSource, appStateOwner } from './appState';


export function startEnforcement(
  runtime: Runtime,
  options: { appState?: AppStateSource } = {},
): Unsubscribe {
  let active = true,
    lastAppliedKey: string | null = null,
    queue = Promise.resolve(),
    watermark = runtime.clock.now(),
    deadlineStop: Unsubscribe | undefined,
    unknownSince: string | undefined,
    lastApplied: EnforcementPlan | undefined,
    lastKnownGood: Exclude<Entitlement['status'], 'unknown'> | undefined;
  const progress = createProgressSync(runtime);
  const stopSessionGuard = startSessionGuard(runtime);
  const apply = async (force = false) => {
    if (!active) return;
    const observed = runtime.clock.now();
    const now = effectiveNow(observed, watermark);
    watermark = nextWatermark(observed, watermark);
    const { rules, lockedApps } = rulesStore.getState().data;
    const { days, earnedUnlocks, walkingSession } = ruleDaysStore.getState().data;
    const decision = resolveLock({
      now,
      timezone: runtime.clock.timezone(),
      rules,
      ruleDays: days,
      earnedUnlocks,
      walkingSession,
      gymPresence: null,
    });
    // An unknown status holds the last applied plan for a moment, then falls back to the last status
    // that was known good, so a slow entitlement read never flips enforcement on its own.
    const entitlement = entitlementStore.getState().data.entitlement;
    if (entitlement.status === 'unknown') unknownSince ??= now;
    else {
      unknownSince = undefined;
      lastKnownGood = entitlement.status;
    }
    const plan = enforcementPlan({ entitlement, decision, now, unknownSince, lastApplied, lastKnownGood });
    lastApplied = plan;
    deadlineStop?.();
    const today = dayKey(now, runtime.clock.timezone());
    const monitors = compileMonitorPlan(
      plan.monitors === 'unregister' ? [] : mergedLockIntervals(rules, today, 8, runtime.clock.timezone()),
      now,
    );
    const intervalBoundaries = Array.from({ length: 9 }, (_, index) => addDays(today, index - 1)).flatMap((day) =>
      rules.flatMap((rule) => windowInstances(rule, day, runtime.clock.timezone()).flatMap(({ start, end }) => [start, end])),
    );
    const futureDecision = decision as typeof decision & { holdsUntil?: string };
    const deadline = nextEnforcementAt({
      now,
      intervalBoundaries,
      relockAt: decision.state === 'unlockedMet' ? decision.relockAt : decision.state === 'afterWindow' ? decision.nextLockAt : decision.state === 'beforeWindow' ? decision.nextLockAt : null,
      leaseUntil: decision.state === 'unlockedWalking' ? decision.leaseUntil : null,
      holdsUntil: futureDecision.holdsUntil,
    });
    deadlineStop = deadline ? runtime.clock.at(deadline, () => void requestApply()) : undefined;
    const key = JSON.stringify({
      shields: plan.shields,
      selectionToken: lockedApps.handle?.token ?? null,
      planHash: monitors.planHash,
    });
    if (!force && key === lastAppliedKey) return;
    lastAppliedKey = key;
    const result = await runtime.screenTime.applyLock(decision, plan, monitors);
    if (active) enforcementStore.getState().publish(result);
  };
  const requestApply = (force = false) => {
    queue = queue.then(() => apply(force));
    return queue;
  };
  void requestApply();
  let retryToken = enforcementStore.getState().retryToken;
  const storeStops = [
    rulesStore.subscribe(() => void requestApply()),
    ruleDaysStore.subscribe(() => void requestApply()),
    entitlementStore.subscribe(() => void requestApply()),
    // Only the retry action re-enters; the host publishes its own results into this store.
    enforcementStore.subscribe((state) => {
      if (state.retryToken === retryToken) return;
      retryToken = state.retryToken;
      void requestApply(true);
    }),
  ];
  const appState = (options.appState ?? appStateOwner()).addEventListener('change', (state) => {
    if (state !== 'active') return;
    void (async () => {
      // The composition's own foreground work — the session refresh, the pedometer re-read, the
      // background gym visits — is awaited alongside these, so the progress refresh below reads
      // what it produced. This is the app's one `AppState` handler; nothing else may subscribe.
      const [camera, selection] = await Promise.all([
        runtime.onForeground?.(),
        runtime.gait.permission(),
        runtime.screenTime.describeSelection(),
      ]).then(([, cameraStatus, described]) => [cameraStatus, described] as const);
      if (!active) return;
      permissionsStore.getState().patch({
        screenTime: runtime.screenTime.authorizationStatus(),
        motion: runtime.steps.authorizationStatus(),
        health: runtime.health.authorizationStatus(),
        notifications: runtime.notifications.status(),
        camera,
      });
      rulesStore.getState().patch({ lockedApps: selection });
      await progress.refresh();
      if (!active) return;
      enforcementStore.getState().claimed(runtime.clock.now());
      await requestApply(true);
    })();
  });
  return () => {
    active = false;
    deadlineStop?.();
    appState.remove();
    storeStops.forEach((stop) => stop());
    stopSessionGuard();
    progress.stop();
  };
}
