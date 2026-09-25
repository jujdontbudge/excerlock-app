import { sessionLapseCount } from '../subscription/winbackSession';
import { useMotion } from '../ui/useMotion';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { entitlementStore as useEntitlementStore } from '../subscription/entitlementStore';
import { onboardingStore as useOnboardingStore } from '../onboarding/onboardingStore';
import { tokens as t } from '../ui/tokens';
import { FakePromptHost } from './lib/FakePromptHost';
import { useRuntime } from '../ports/useRuntime';
import { useRuntimeStatus } from '../lock/selectors';
import { useScreenTracking } from '../telemetry/useScreenTracking';
import { linkedTrace } from '@linked-trace';
import Constants from 'expo-constants';
import { diagnosticsRoutesEnabled } from '../platform/diagnosticsRoutes';
export function RootNavigator() {
  const motion = useMotion();
  const pathname = usePathname();
  const router = useRouter();
  const runtime = useRuntime();
  useScreenTracking();
  const loading = useRuntimeStatus().loading;
  const status = useEntitlementStore((s) => s.data.entitlement.status),
    onboarding = useOnboardingStore((s) => s.data),
    entitled = status === 'trial' || status === 'active';
  const handledLapses = useRef(sessionLapseCount());
  useEffect(() => {
    const lapses = sessionLapseCount();
    if (lapses === handledLapses.current || !onboarding.setupComplete) return;
    handledLapses.current = lapses;
    if (pathname !== '/paywall') router.push('/paywall');
  }, [onboarding.setupComplete, pathname, router, status]);
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: motion.reduced ? 'fade' : 'slide_from_right',
          animationDuration: t.motion.duration.emphasized,
        }}>
        <Stack.Screen name="index" />
        {__DEV__ ? <Stack.Screen name="dev" /> : null}
        <Stack.Protected guard={__LINKED_RECORDER_TRACE__ && linkedTrace.enabled}>
          <Stack.Screen name="linked-trace" />
        </Stack.Protected>
        <Stack.Protected guard={!__LINKED_RECORDER_TRACE__}>
          <Stack.Screen name="gym-picker" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Protected guard={loading || (!onboarding.complete && onboarding.step !== 'P' && !entitled)}>
            <Stack.Screen name="onboarding/[step]" />
          </Stack.Protected>
          <Stack.Protected guard={loading || !entitled || onboarding.setupComplete}>
            <Stack.Screen
              name="paywall"
              options={{
                presentation: onboarding.setupComplete ? 'modal' : 'card',
                gestureEnabled: onboarding.setupComplete,
              }}
            />
          </Stack.Protected>
          <Stack.Protected guard={loading || (entitled && !onboarding.setupComplete)}>
            <Stack.Screen name="setup/[step]" />
          </Stack.Protected>
          <Stack.Protected guard={loading || onboarding.setupComplete}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="sign-in" options={{ presentation: 'fullScreenModal' }} />
          </Stack.Protected>
          <Stack.Protected guard={loading || onboarding.setupComplete}>
            <Stack.Screen name="builder" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="permissions/[step]" options={{ presentation: 'fullScreenModal' }} />
          </Stack.Protected>
          <Stack.Protected guard={loading || (entitled && onboarding.setupComplete)}>
            <Stack.Screen name="unlock/gym" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="unlock/treadmill" options={{ presentation: 'fullScreenModal' }} />
          </Stack.Protected>
          <Stack.Protected guard={diagnosticsRoutesEnabled(Constants.expoConfig?.extra?.environment, __DEV__)}>
            <Stack.Screen name="diagnostics/sensors" />
          </Stack.Protected>
        </Stack.Protected>
      </Stack>
      {__DEV__ && runtime.kind === 'fake' ? <FakePromptHost /> : null}
    </>
  );
}
