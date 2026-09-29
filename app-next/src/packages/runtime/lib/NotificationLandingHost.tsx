import { useEffect } from 'react';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useRuntime } from '../../ports/useRuntime';
import { notificationLanding } from '../../notifications/notificationPlan';
import { reportRuntimeError } from '../../telemetry/reportRuntimeError';

export function NotificationLandingHost() {
  const runtime = useRuntime();
  const navigation = useRootNavigationState();
  const router = useRouter();
  useEffect(() => {
    if (!navigation?.key) return;
    let mounted = true;
    const handled = new Set<string>();
    const receive = (response: Awaited<ReturnType<typeof runtime.notificationResponses.last>>) => {
      if (!mounted || !response) return;
      const target = notificationLanding(response.url);
      if (!target) return;
      const key = `${response.id}:${response.receivedAt}:${response.action}`;
      if (handled.has(key)) return;
      handled.add(key);
      router.push(target);
      void runtime.notificationResponses.clear().catch(reportRuntimeError);
    };
    const stop = runtime.notificationResponses.subscribe(receive);
    void runtime.notificationResponses.last().then(receive).catch(reportRuntimeError);
    return () => {
      mounted = false;
      stop();
    };
  }, [navigation?.key, router, runtime]);
  return null;
}
