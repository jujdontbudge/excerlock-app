import { Slot } from 'expo-router';
import { Text } from 'react-native';
import { renderRouter } from 'expo-router/testing-library';
import { BootGate } from '../../features/launch/BootGate';
import { scenarios } from '../scenarios';
import { createRuntime } from '../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../runtime/AppRuntimeProvider';
import { entitlementAccess } from '../../domain/entitlementAccess';
test.each(scenarios.map((s) => [s.id, s] as const))('%s reaches its expected boot route', async (_, scenario) => {
  const runtime = createRuntime();
  await runtime.dev.load(scenario.id);
  const expected =
    scenario.onboarding === 'fresh'
      ? '/onboarding/O01'
      : scenario.onboarding.startsWith('resumeAt:')
        ? `/onboarding/${scenario.onboarding.slice(9)}`
        : entitlementAccess(scenario.entitlement.status).appAccess
          ? '/home'
          : '/paywall';
  const router = renderRouter(
    {
      _layout: () => <AppRuntimeProvider runtime={runtime}><Slot /></AppRuntimeProvider>,
      index: BootGate,
      'onboarding/[step]': () => <Text>Onboarding</Text>,
      paywall: () => <Text>Paywall</Text>,
      '(tabs)/_layout': () => <Slot />,
    builder: () => <Text>Builder</Text>,
    '(tabs)/home': () => <Text>Home</Text>,
    },
    { initialUrl: '/' },
  );
  await router;
  expect(router.getPathname()).toBe(expected);
});
