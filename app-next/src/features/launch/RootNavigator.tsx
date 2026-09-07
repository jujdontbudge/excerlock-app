import { useMotion } from '../../motion/useMotion';
import { Stack } from 'expo-router';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { tokens as t } from '../../design-system/tokens';
import { FakePromptHost } from '../permissions/FakePromptHost';
import { useDevSnapshot } from '../../state/selectors';
export function RootNavigator() {
  const motion = useMotion();
  const loading = Boolean(useDevSnapshot().loading);
  const status = useEntitlementStore((s) => s.data.entitlement.status),
    onboarding = useOnboardingStore((s) => s.data),
    entitled = status === 'trial' || status === 'active';
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: motion.reduced ? 'fade' : 'slide_from_right',
          animationDuration: t.motion.duration.navigation,
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="dev" />
        <Stack.Screen name="gym-picker" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Protected guard={loading || (!onboarding.complete && onboarding.step !== 'P' && !entitled)}>
          <Stack.Screen name="onboarding/[step]" />
        </Stack.Protected>
        <Stack.Protected guard={loading || !entitled}>
          <Stack.Screen name="paywall" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={loading || (entitled && !onboarding.setupComplete)}>
          <Stack.Screen name="setup/[step]" />
        </Stack.Protected>
        <Stack.Protected guard={loading || (entitled && onboarding.setupComplete)}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="sign-in" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="builder" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="unlock/gym" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="unlock/treadmill" options={{ presentation: 'fullScreenModal' }} />
        </Stack.Protected>
      </Stack>
      <FakePromptHost />
    </>
  );
}
