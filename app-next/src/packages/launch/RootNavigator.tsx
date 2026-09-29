import { useMotion } from '../ui/useMotion';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { entitlementStore as useEntitlementStore } from '../subscription/entitlementStore';
import { tokens as t } from '../ui/tokens';
import { FakePromptHost } from './lib/FakePromptHost';
import { useRuntime } from '../ports/useRuntime';
import { useScreenTracking } from '../telemetry/useScreenTracking';
import { linkedTrace } from '@linked-trace';
import Constants from 'expo-constants';
import { diagnosticsRoutesEnabled } from '../platform/diagnosticsRoutes';
import { beginPaywall, useJourney, verifySelectedAccount } from '../journey/index';
export function RootNavigator() {
  const motion = useMotion();
  const router = useRouter();
  const runtime = useRuntime();
  const journey = useJourney(runtime);
  useScreenTracking();
  const status = useEntitlementStore((s) => s.data.entitlement.status);
  useEffect(() => {
    if (journey.phase !== 'app' || journey.canEnterApp) return;
    const identity = runtime.auth.identity();
    if (identity.kind === 'canonical' && !identity.isAnonymous && identity.userId) {
      void verifySelectedAccount(runtime).then((result) => {
        if (result === 'paid') router.replace('/setup/X1');
        else if (result === 'unpaid') router.replace('/paywall');
        else router.replace('/sign-in');
      });
      return;
    }
    beginPaywall();
    router.replace('/paywall');
  }, [journey.phase, journey.canEnterApp, router, runtime]);
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
          <Stack.Protected guard={journey.canEnterApp}>
            <Stack.Screen name="gym-picker" options={{ presentation: 'fullScreenModal' }} />
          </Stack.Protected>
          <Stack.Protected guard={journey.phase === 'welcome' || journey.phase === 'onboarding'}>
            <Stack.Screen name="onboarding/[step]" />
          </Stack.Protected>
          <Stack.Protected guard={journey.phase === 'paywall'}>
            <Stack.Screen name="paywall" options={{ presentation: 'card', gestureEnabled: false }} />
          </Stack.Protected>
          <Stack.Protected guard={journey.phase === 'setup' && journey.paid}>
            <Stack.Screen name="setup/[step]" />
          </Stack.Protected>
          <Stack.Protected guard={journey.phase === 'signIn' || journey.phase === 'verifying'}>
            <Stack.Screen name="sign-in" options={{ presentation: 'fullScreenModal' }} />
          </Stack.Protected>
          <Stack.Protected guard={!journey.canEnterApp}>
            <Stack.Screen name="recovery" />
          </Stack.Protected>
          <Stack.Protected guard={journey.canEnterApp}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="settings" />
          </Stack.Protected>
          <Stack.Protected guard={journey.canEnterApp}>
            <Stack.Screen name="builder" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="permissions/[step]" options={{ presentation: 'fullScreenModal' }} />
          </Stack.Protected>
          <Stack.Protected guard={journey.canEnterApp && (status === 'trial' || status === 'active')}>
            <Stack.Screen name="unlock/gym" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="unlock/treadmill" options={{ presentation: 'fullScreenModal' }} />
          </Stack.Protected>
          <Stack.Protected guard={journey.canEnterApp && diagnosticsRoutesEnabled(Constants.expoConfig?.extra?.environment, __DEV__)}>
            <Stack.Screen name="diagnostics/sensors" />
          </Stack.Protected>
        </Stack.Protected>
      </Stack>
      {__DEV__ && runtime.kind === 'fake' ? <FakePromptHost /> : null}
    </>
  );
}
