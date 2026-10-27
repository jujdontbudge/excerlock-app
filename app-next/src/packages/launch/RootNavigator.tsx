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
import { beginPaywall, useJourney } from '../journey/index';
export function RootNavigator() {
  const motion = useMotion();
  const router = useRouter();
  const runtime = useRuntime();
  const journey = useJourney(runtime);
  useScreenTracking();
  const status = useEntitlementStore((s) => s.data.entitlement.status);
  useEffect(() => {
    if (journey.phase !== 'app' || journey.canEnterApp) return;
    beginPaywall();
    router.replace('/paywall');
  }, [journey.phase, journey.canEnterApp, router]);
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: motion.reduced ? 'fade' : 'slide_from_right',
          animationDuration: t.motion.duration.emphasized,
        }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={__DEV__}>
          <Stack.Screen name="diagnostics/bank-drain" />
        </Stack.Protected>
        {__DEV__ ? <Stack.Screen name="dev" /> : null}
        {__DEV__ ? <Stack.Screen name="sample-paywall" /> : null}
        {__DEV__ ? <Stack.Screen name="treadmill-preview" options={{ presentation: 'fullScreenModal' }} /> : null}
        <Stack.Protected guard={__LINKED_RECORDER_TRACE__ && linkedTrace.enabled}>
          <Stack.Screen name="linked-trace" />
        </Stack.Protected>
        <Stack.Protected guard={!__LINKED_RECORDER_TRACE__}>
          <Stack.Protected guard={journey.canEnterApp || (journey.phase === 'setup' && journey.paid)}>
            <Stack.Screen name="gym-picker" options={{ presentation: 'fullScreenModal' }} />
          </Stack.Protected>
          <Stack.Protected guard={journey.phase === 'launch' || journey.phase === 'welcome' || journey.phase === 'onboarding'}>
            <Stack.Screen name="onboarding/[step]" />
          </Stack.Protected>
          <Stack.Protected guard={journey.phase === 'paywall'}>
            <Stack.Screen name="paywall" options={{ presentation: 'card', gestureEnabled: false }} />
            <Stack.Screen name="close-offer" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
          </Stack.Protected>
          <Stack.Protected guard={journey.phase === 'setup' && journey.paid}>
            <Stack.Screen name="setup/[step]" />
          </Stack.Protected>
          <Stack.Protected guard={journey.phase === 'signIn' || journey.canEnterApp}>
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
