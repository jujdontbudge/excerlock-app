import { useMotion } from '../ui/useMotion';
import { Stack, useRouter, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { entitlementStore as useEntitlementStore } from '../subscription/entitlementStore';
import { tokens as t } from '../ui/tokens';
import { FakePromptHost } from './lib/FakePromptHost';
import { useRuntime } from '../ports/useRuntime';
import { useScreenTracking } from '../telemetry/useScreenTracking';
import { linkedTrace } from '@linked-trace';
import Constants from 'expo-constants';
import { diagnosticsRoutesEnabled } from '../platform/diagnosticsRoutes';
import { beginPaywall, renewAdmission, useJourney, verifySelectedAccount } from '../journey/index';
import { StyleSheet, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { BootScreen } from './lib/BootScreen';
import { reportRuntimeError } from '../telemetry/reportRuntimeError';
import { finishOtaLaunch, isOtaSafeRoute, noteOtaPaywallReached, setOtaNavigationTransition, shouldCoverOtaDestination } from '../updates/updates';
export function RootNavigator() {
  const motion = useMotion();
  const pathname = usePathname();
  const [coverDestination, setCoverDestination] = useState(shouldCoverOtaDestination);
  useEffect(() => {
    if (pathname === '/') return;
    const frame = requestAnimationFrame(finishOtaLaunch);
    const timer = setTimeout(() => setCoverDestination(false), t.motion.duration.emphasized);
    if (pathname === '/paywall' || pathname.startsWith('/setup/') || isOtaSafeRoute(pathname)) void noteOtaPaywallReached().catch(reportRuntimeError);
    return () => { clearTimeout(timer); cancelAnimationFrame(frame); };
  }, [pathname]);
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
  useEffect(() => runtime.clock.subscribe(() => void renewAdmission(runtime)?.catch(reportRuntimeError)), [runtime]);
  return (
    <>
      <Stack
        screenListeners={{ transitionStart: () => setOtaNavigationTransition(true), transitionEnd: () => setOtaNavigationTransition(false) }}
        screenOptions={{
          headerShown: false,
          animation: coverDestination ? 'none' : motion.reduced ? 'fade' : 'slide_from_right',
          animationDuration: t.motion.duration.emphasized,
        }}>
        <Stack.Screen name="index" />
        {__DEV__ ? <Stack.Screen name="dev" /> : null}
        {__DEV__ ? <Stack.Screen name="sample-paywall" /> : null}
        <Stack.Protected guard={__LINKED_RECORDER_TRACE__ && linkedTrace.enabled}>
          <Stack.Screen name="linked-trace" />
        </Stack.Protected>
        <Stack.Protected guard={!__LINKED_RECORDER_TRACE__}>
          <Stack.Protected guard={journey.canEnterApp || (journey.phase === 'setup' && journey.paid)}>
            <Stack.Screen name="gym-picker" options={{ presentation: 'fullScreenModal' }} />
          </Stack.Protected>
          <Stack.Protected guard={journey.phase === 'welcome' || journey.phase === 'onboarding'}>
            <Stack.Screen name="onboarding/[step]" />
          </Stack.Protected>
          <Stack.Protected guard={
            journey.phase === 'paywall' || journey.phase === 'pendingPurchase' || journey.phase === 'accountRecovery'
          }>
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
      {journey.checking ? (
        <FullWindowOverlay>
          <View style={StyleSheet.absoluteFill}>
            <BootScreen />
          </View>
        </FullWindowOverlay>
      ) : null}
    </>
  );
}
