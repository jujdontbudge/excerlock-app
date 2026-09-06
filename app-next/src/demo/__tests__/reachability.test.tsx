import { Text } from 'react-native';
import { renderRouter } from 'expo-router/testing-library';
import { BootGate } from '../../features/launch/BootGate';
import { scenarios } from '../scenarios';
import { loadScenario } from '../scenarioLoader';
test.each(scenarios.map((s) => [s.id, s] as const))('%s reaches its expected boot route', async (_, scenario) => {
  await loadScenario(scenario);
  const expected =
    scenario.onboarding === 'fresh'
      ? '/onboarding/O01'
      : scenario.onboarding.startsWith('resumeAt:')
        ? `/onboarding/${scenario.onboarding.slice(9)}`
        : ['trial', 'active'].includes(scenario.entitlement.status)
          ? '/home'
          : '/paywall';
  const router = renderRouter(
    {
      index: BootGate,
      'onboarding/[step]': () => <Text>Onboarding</Text>,
      paywall: () => <Text>Paywall</Text>,
      '(tabs)/home': () => <Text>Home</Text>,
    },
    { initialUrl: '/' },
  );
  await router;
  expect(router.getPathname()).toBe(expected);
});
