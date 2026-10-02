import { Href, useRootNavigationState, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useJourney } from '../../journey/index';
import { useRuntimeStatus } from '../../lock/selectors';
import { useRuntime } from '../../ports/useRuntime';
import { reportRuntimeError } from '../../telemetry/reportRuntimeError';
import { createAsyncStorageOtaStorage, isOtaSafeRoute, normalizeOtaRoute } from '../../updates/updates';

const otaResumeStorage = createAsyncStorageOtaStorage();

export function OtaResumeHost() {
  const runtime = useRuntime();
  const journey = useJourney(runtime);
  const status = useRuntimeStatus();
  const navigation = useRootNavigationState();
  const router = useRouter();
  const attempted = useRef(false);
  useEffect(() => {
    if (attempted.current || !status.hydrated || status.loading || !navigation?.key) return;
    attempted.current = true;
    let mounted = true;
    void otaResumeStorage.loadEnvelope().then(async (envelope) => {
      if (!mounted || !envelope || envelope.onboarding) return;
      const route = normalizeOtaRoute(envelope.route) ?? envelope.route;
      const canRestore = journey.canEnterApp && isOtaSafeRoute(route);
      await otaResumeStorage.clearEnvelope();
      if (!mounted) return;
      runtime.dev?.recordOtaResume(route, canRestore ? 'restored' : 'denied');
      if (canRestore) router.replace(route as Href);
    }).catch(reportRuntimeError);
    return () => {
      mounted = false;
    };
  }, [journey.canEnterApp, navigation?.key, router, runtime, status.hydrated, status.loading]);
  return null;
}
