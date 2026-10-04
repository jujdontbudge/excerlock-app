import { useEffect } from 'react';
import { useRuntime } from '../ports/useRuntime';
import { permissionsStore } from '../permissions/permissionsStore';
import { reportRuntimeError } from '../telemetry/reportRuntimeError';
import { proppedWarningPlan } from './notificationPlan';
export function ProppedWarningHost() {
  const runtime = useRuntime();
  useEffect(() => {
    let signature = '',
      disposed = false;
    const update = () => {
      const walking = runtime.walking.snapshot();
      const now = Date.parse(runtime.clock.now());
      const identity = runtime.auth.identity();
      const plan =
        identity.kind !== 'deleting' && walking.proppedVerified && walking.proppedEligibleUntil !== null
          ? proppedWarningPlan(walking.proppedEligibleUntil, now)
          : null;
      const granted = runtime.notifications.status() === 'granted';
      const next = JSON.stringify([
        identity.generation,
        granted,
        walking.proppedVerified ? walking.proppedEligibleUntil : null,
      ]);
      if (disposed || signature === next) return;
      signature = next;
      const work =
        plan && granted
          ? runtime.notifications.scheduleProppedWarning(new Date(plan.at).toISOString())
          : runtime.notifications.cancel('propped_expiring');
      void work.catch((error) => {
        if (signature === next) signature = '';
        reportRuntimeError(error);
      });
    };
    const stops = [
      runtime.walking.observe(update),
      runtime.clock.subscribe(update),
      runtime.auth.subscribeIdentity(update),
      permissionsStore.subscribe(update),
    ];
    update();
    return () => {
      disposed = true;
      stops.forEach((stop) => stop());
    };
  }, [runtime]);
  return null;
}
