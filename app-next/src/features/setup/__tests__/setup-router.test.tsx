import { Slot } from 'expo-router';
import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { RootNavigator } from '../../launch/RootNavigator';
import { BootGate } from '../../launch/BootGate';
import { SetupRoute } from '../SetupRoute';
import { createRuntime } from '../../../runtime/createRuntime';
import { onboardingStore } from '../../../state/onboardingStore';
import { permissionsStore } from '../../../state/permissionsStore';
test.each([
  ['home-locked-walking', 'X4', 'Save your progress'],
  ['gym-arrival-user', 'X3', 'Pick your gym'],
  ['gym-time-user', 'X3', 'Pick your gym'],
] as const)('%s resumes at %s without the permission primers', async (scenario, expected, title) => {
  const runtime = createRuntime();
  await runtime.dev.load(scenario);
  onboardingStore.getState().patch({ setupComplete: false, setupStep: 'X3' });
  const routes = {
    _layout: () => (
      <AppRuntimeProvider runtime={runtime}>
        <RootNavigator />
      </AppRuntimeProvider>
    ),
    index: BootGate,
    'setup/[step]': SetupRoute,
    'onboarding/[step]': () => <Text>Onboarding</Text>,
    paywall: () => <Text>Paywall</Text>,
    '(tabs)/_layout': () => <Slot />,
    builder: () => <Text>Builder</Text>,
    '(tabs)/home': () => <Text>Home</Text>,
    dev: () => <Text>Dev</Text>,
  };
  const result = renderRouter(routes, { initialUrl: '/' });
  await result;
  expect(result.getPathname()).toBe('/setup/' + expected);
  expect(screen.getByRole('header', { name: title })).toBeTruthy();
});
test('skips preserve missing grants and X5 reports them before completing', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-permission-needed');
  onboardingStore.getState().patch({ setupComplete: false, setupStep: 'X5' });
  permissionsStore.getState().patch({ screenTime: 'denied' });
  const result = renderRouter(
    {
      _layout: () => (
        <AppRuntimeProvider runtime={runtime}>
          <RootNavigator />
        </AppRuntimeProvider>
      ),
      index: BootGate,
      'setup/[step]': SetupRoute,
      'onboarding/[step]': () => <Text>Onboarding</Text>,
      paywall: () => <Text>Paywall</Text>,
      '(tabs)/_layout': () => <Slot />,
      builder: () => <Text>Builder</Text>,
      '(tabs)/home': () => <Text>Home</Text>,
      dev: () => <Text>Dev</Text>,
    },
    { initialUrl: '/setup/X5' },
  );
  await result;
  expect(screen.getByRole('checkbox', { name: 'Screen Time access' })).not.toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Trial reminder' })).not.toBeChecked();
  await fireEvent.press(screen.getByRole('button', { name: 'Go to Home' }));
  expect(result.getPathname()).toBe('/home');
  expect(onboardingStore.getState().data.setupComplete).toBe(true);
});
