import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { usePathname, useRootNavigationState } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useRuntime } from '../../ports/useRuntime';
import { useRuntimeStatus } from '../../lock/selectors';
import { getOtaObservabilityContext, useOtaCoordinator } from '../../updates/updates';
import { trialReminderPlan } from '../../notifications/notificationPlan';
import { expoLocalNotifications } from '../../notifications/ExpoLocalNotifications';
import { permissionsStore } from '../../permissions/permissionsStore';
import { reportRuntimeError } from '../../telemetry/reportRuntimeError';
import { currentJourney, refreshAdmission } from '../../journey/index';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function NativeRuntimeEffects() {
  const runtime = useRuntime();
  const status = useRuntimeStatus();
  const pathname = usePathname();
  const navigation = useRootNavigationState();
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const coordinator = useOtaCoordinator({
    getSafety: () => {
      const safety = runtime.safety?.();
      const walking = runtime.walking.snapshot();
      const operation = runtime.subscription.operation();
      return {
        route: pathname,
        isForeground: live.current && AppState.currentState === 'active',
        purchaseOrRestoreBusy: operation.busy || operation.pending,
        permissionPromptPending: safety?.permissionPromptPending ?? null,
        cameraActive: safety?.cameraActive ?? null,
        walkingActive:
          walking && ['inactive', 'active', 'grace', 'verifying', 'unknown'].includes(walking.phase)
            ? ['active', 'grace', 'verifying'].includes(walking.phase)
            : null,
        proppedActive: typeof walking?.proppedVerified === 'boolean' ? walking.proppedVerified : null,
      };
    },
    getEnvelope: () => (live.current ? { route: pathname, draftIds: [] } : null),
    report: (message) => reportRuntimeError(new Error(message)),
  });

  useEffect(() => {
    if (!status.hydrated || status.loading || !navigation?.key || pathname === '/') return;
    let mounted = true;
    const frame = requestAnimationFrame(() => {
      void runtime.status
        .flush()
        .then(async () => {
          if (!mounted || !runtime.status.snapshot().hydrated || runtime.status.snapshot().loading) return;
          await coordinator.markSuccessfulLaunch(getOtaObservabilityContext().update_id);
        })
        .catch(reportRuntimeError);
    });
    return () => {
      mounted = false;
      cancelAnimationFrame(frame);
    };
  }, [coordinator, runtime, status.hydrated, status.loading, navigation?.key, pathname]);

  useEffect(() => {
    const refresh = () => {
      if (currentJourney().phase === 'app') void refreshAdmission(runtime).catch(reportRuntimeError);
    };
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => foreground.remove();
  }, [runtime]);

  useEffect(() => {
    let disposed = false;
    let signature: string | null = null;
    const update = () => {
      const identity = runtime.auth.identity();
      const plan =
        identity.kind === 'deleting' ? null : trialReminderPlan(runtime.subscription.entitlement(), Date.now());
      const next = JSON.stringify([identity.generation, plan?.at ?? null, runtime.notifications.status()]);
      if (disposed || signature === next) return;
      signature = next;
      const work =
        plan && runtime.notifications.status() === 'granted'
          ? runtime.notifications.scheduleTrialReminder(new Date(plan.at).toISOString())
          : runtime.notifications.cancel('trial_ending');
      void work.catch((error) => {
        if (signature === next) signature = null;
        reportRuntimeError(error);
      });
    };
    const refresh = () => {
      void expoLocalNotifications.permission(false).then(update).catch(reportRuntimeError);
    };
    refresh();
    const stops = [
      runtime.subscription.subscribe(update),
      runtime.auth.subscribeIdentity(update),
      permissionsStore.subscribe(update),
    ];
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      disposed = true;
      stops.forEach((stop) => stop());
      foreground.remove();
    };
  }, [runtime]);

  useEffect(() => {
    const sync = () => {
      void runtime.shieldCopy?.sync();
    };
    sync();
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => foreground.remove();
  }, [runtime]);

  useEffect(() => {
    const sync = () => {
      void runtime.strideGate?.sync();
    };
    sync();
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => foreground.remove();
  }, [runtime]);

  return null;
}
