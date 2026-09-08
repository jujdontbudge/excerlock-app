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
import { sessionStore } from '../../../state/sessionStore';
test.each([
  ['home-locked-walking', 'Let ExcerLock count your steps'],
  ['gym-arrival-user', 'Pick your gym'],
  ['runner-distance', 'Read your workouts from Apple Health'],
] as const)('%s resumes the correct X3', async (scenario, title) => {
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
  expect(result.getPathname()).toBe('/setup/X3');
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
  expect(screen.getByRole('header', { name: 'Almost set' })).toBeTruthy();
  expect(screen.getByText('Tap anything unfinished to set it up now.')).toBeTruthy();
  expect(screen.getByRole('checkbox', { name: 'Screen Time access' })).not.toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Screen Time access' })).not.toBeDisabled();
  expect(screen.getByText('Screen Time access is off, so apps cannot be blocked.')).toBeTruthy();
  expect(screen.getByRole('checkbox', { name: 'Trial reminder' })).not.toBeChecked();
  expect(screen.getByText('Trial reminders are off.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Go to Home' }));
  expect(result.getPathname()).toBe('/home');
  expect(onboardingStore.getState().data.setupComplete).toBe(true);
});

test('a gym user is asked for Location after the picker inside X3', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('gym-arrival-user');
  onboardingStore.getState().patch({ setupComplete: false, setupStep: 'X3a' });
  const result = renderRouter(
    {
      _layout: () => <AppRuntimeProvider runtime={runtime}><RootNavigator /></AppRuntimeProvider>,
      index: BootGate,
      'setup/[step]': SetupRoute,
      '(tabs)/_layout': () => <Slot />,
      '(tabs)/home': () => <Text>Home</Text>,
    },
    { initialUrl: '/setup/X3a' },
  );
  await result;
  expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
  expect(screen.getByRole('progressbar', { name: 'Setup progress' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Skip for now' }));
  expect(result.getPathname()).toBe('/setup/X3b');
  expect(screen.getByRole('header', { name: 'Recognize your gym visits' })).toBeTruthy();
});

test('an unchecked X5 row routes to its fix while a checked row does nothing', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  onboardingStore.getState().patch({ setupComplete: false, setupStep: 'X5' });
  permissionsStore.getState().patch({ screenTime: 'denied' });
  const result = renderRouter(
    {
      _layout: () => <AppRuntimeProvider runtime={runtime}><RootNavigator /></AppRuntimeProvider>,
      index: BootGate,
      'setup/[step]': SetupRoute,
      'settings/permission/[name]': () => <Text>Permission settings</Text>,
      '(tabs)/_layout': () => <Slot />,
      '(tabs)/home': () => <Text>Home</Text>,
    },
    { initialUrl: '/setup/X5' },
  );
  await result;
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Apps selected' }));
  expect(result.getPathname()).toBe('/setup/X5');
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Screen Time access' }));
  expect(result.getPathname()).toBe('/setup/X1');
});

test("SetupComplete says You're all set only when every row is checked", async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  onboardingStore.getState().patch({ setupComplete: false, setupStep: 'X5' });
  permissionsStore.getState().patch({ screenTime: 'granted', motion: 'granted', notifications: 'granted' });
  sessionStore.getState().patch({ session: { kind: 'signedIn', userId: 'user-apple', provider: 'apple', email: 'alex@example.test' } });
  const result = renderRouter(
    {
      _layout: () => <AppRuntimeProvider runtime={runtime}><RootNavigator /></AppRuntimeProvider>,
      index: BootGate,
      'setup/[step]': SetupRoute,
      '(tabs)/_layout': () => <Slot />,
      '(tabs)/home': () => <Text>Home</Text>,
    },
    { initialUrl: '/setup/X5' },
  );
  await result;
  expect(screen.getByRole('header', { name: "You're all set" })).toBeTruthy();
});
