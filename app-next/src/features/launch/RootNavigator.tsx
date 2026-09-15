import { useMotion } from '../../motion/useMotion';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { tokens as t } from '../../design-system/tokens';
import { FakePromptHost } from '../permissions/FakePromptHost';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { useRuntimeStatus } from '../../state/selectors';
import { linkedTrace } from '@linked-trace';
export function RootNavigator() {
  const motion = useMotion();
  const pathname = usePathname();
  const router = useRouter();
  const runtime = useRuntime();
  const loading = useRuntimeStatus().loading;
  const status = useEntitlementStore((s) => s.data.entitlement.status),
    onboarding = useOnboardingStore((s) => s.data),
    entitled = status === 'trial' || status === 'active';
  const previousSettledStatus = useRef(status);
  useEffect(() => {
    const previous = previousSettledStatus.current;
    if (status !== 'unknown') previousSettledStatus.current = status;
    if (
      onboarding.setupComplete &&
      (previous === 'trial' || previous === 'active') &&
      (status === 'expired' || status === 'billingIssue')
    ) {
      if (pathname !== '/paywall') router.push('/paywall');
    }
  }, [onboarding.setupComplete, pathname, router, status]);
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: motion.reduced ? 'fade' : 'slide_from_right',
          animationDuration: t.motion.duration.navigation,
        }}>
        <Stack.Screen name="index" />
        {__DEV__ ? <Stack.Screen name="dev" /> : null}
        <Stack.Protected guard={__LINKED_RECORDER_TRACE__ && linkedTrace.enabled}>
          <Stack.Screen name="linked-trace" />
        </Stack.Protected>
        {/* One lab-off guard owns the whole production surface. When the
            research flag is compiled in, expo-router collects every production
            screen name below as protected and removes it from the lab
            navigator, so onboarding, paywall, setup, the gym picker, tabs,
            settings and sign-in cannot be reached by navigation or deep link.
            In an ordinary build the guard is true and the routes behave
            exactly as before. */}
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
          <Stack.Protected guard={loading || (entitled && onboarding.setupComplete)}>
            <Stack.Screen name="builder" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="unlock/gym" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="unlock/treadmill" options={{ presentation: 'fullScreenModal' }} />
          </Stack.Protected>
        </Stack.Protected>
      </Stack>
      {__DEV__ && runtime.kind === 'fake' ? <FakePromptHost /> : null}
    </>
  );
}
