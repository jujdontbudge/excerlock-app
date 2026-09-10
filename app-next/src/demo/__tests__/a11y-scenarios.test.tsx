import { Slot } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { scenarios } from '../scenarios';
import { createRuntime } from '../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../runtime/AppRuntimeProvider';
import { assertAccessible } from '../../testing/assertAccessible';
import { HomeScreen } from '../../features/home/HomeScreen';
import { OnboardingRoute } from '../../features/onboarding/OnboardingRoute';
import { PaywallSlot } from '../../features/subscription/PaywallSlot';
import { AnalyticsScreen } from '../../features/analytics/AnalyticsScreen';
import { SettingsScreen } from '../../features/settings/SettingsScreen';
import Conditions from '../../../app/(tabs)/conditions';
test.each(scenarios.map((s) => [s.id, s] as const))('%s mounts named accessible controls', async (_, scenario) => {
  const runtime = createRuntime();
  await runtime.dev.load(scenario.id);
  const path =
    scenario.onboarding === 'fresh'
      ? '/onboarding/O01'
      : scenario.onboarding.startsWith('resumeAt:')
        ? '/onboarding/' + scenario.onboarding.slice(9)
        : '/home';
  const router = renderRouter(
    {
      _layout: () => (
        <AppRuntimeProvider runtime={runtime}>
          <Slot />
        </AppRuntimeProvider>
      ),
      home: HomeScreen,
      'onboarding/[step]': OnboardingRoute,
      paywall: PaywallSlot,
    },
    { initialUrl: path },
  );
  const rendered = await router;
  assertAccessible(rendered.toJSON());
  await rendered.unmount();
});
test.each(['conditions', 'analytics', 'settings'])('%s tab exposes accessible controls', async (tab) => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  const router = renderRouter(
    {
      _layout: () => (
        <AppRuntimeProvider runtime={runtime}>
          <Slot />
        </AppRuntimeProvider>
      ),
      conditions: Conditions,
      analytics: AnalyticsScreen,
      settings: () => <SettingsScreen navigate={jest.fn()} onDev={jest.fn()} />,
    },
    { initialUrl: '/' + tab },
  );
  const rendered = await router;
  assertAccessible(rendered.toJSON());
  await rendered.unmount();
});
