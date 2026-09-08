import { Text } from 'react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { RootNavigator } from '../../launch/RootNavigator';
import { HomeScreen } from '../../home/HomeScreen';
import { BootGate } from '../../launch/BootGate';
import Tabs from '../../../../app/(tabs)/_layout';
import { SettingsScreen } from '../../settings/SettingsScreen';
import { render, userEvent } from '@testing-library/react-native';

jest.mock('../../../runtime/devFlag', () => ({ devMenuEnabled: false }));

const routes = (runtime: ReturnType<typeof createRuntime>) => ({
  _layout: () => (
    <AppRuntimeProvider runtime={runtime}>
      <RootNavigator />
    </AppRuntimeProvider>
  ),
  index: BootGate,
  dev: () => <Text>Developer route</Text>,
  'gym-picker': () => <Text>Gym picker</Text>,
  settings: () => <Text>Settings</Text>,
  'sign-in': () => <Text>Sign in</Text>,
  builder: () => <Text>Builder</Text>,
  paywall: () => <Text>Paywall</Text>,
  'unlock/gym': () => <Text>Gym unlock</Text>,
  'unlock/treadmill': () => <Text>Treadmill unlock</Text>,
  'onboarding/[step]': () => <Text>Onboarding</Text>,
  'setup/[step]': () => <Text>Setup</Text>,
  '(tabs)/_layout': Tabs,
  '(tabs)/home': HomeScreen,
  '(tabs)/conditions': () => <Text>Conditions</Text>,
  '(tabs)/analytics': () => <Text>Analytics</Text>,
  '(tabs)/settings': () => <Text>Settings tab</Text>,
});

test('the dev route is not registered when the dev flag is off', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');

  const router = renderRouter(routes(runtime), { initialUrl: '/dev' });
  const rendered = await router;

  expect(router.getPathname()).not.toBe('/dev');
  expect(screen.queryByText('Developer route')).toBeNull();
  rendered.unmount();
  runtime.dispose();
});

test('excerlock://home dev parameters leave runtime controls untouched when the dev flag is off', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  const before = {
    steps: await runtime.steps.stepsSince(runtime.clock.now()),
    now: runtime.clock.now(),
    presence: runtime.dev.snapshot().presence,
    placement: runtime.dev.snapshot().placement,
  };

  const router = await renderRouter(routes(runtime), {
    initialUrl: '/home?steps=5000&advance=60000&presence=inside&placement=handheld',
  });
  await Promise.resolve();

  expect({
    steps: await runtime.steps.stepsSince(runtime.clock.now()),
    now: runtime.clock.now(),
    presence: runtime.dev.snapshot().presence,
    placement: runtime.dev.snapshot().placement,
  }).toEqual(before);
  router.unmount();
  runtime.dispose();
});

test('the settings footer ignores seven taps when the dev flag is off', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  const onDev = jest.fn();
  const rendered = await render(
    <AppRuntimeProvider runtime={runtime}>
      <SettingsScreen navigate={() => {}} onDev={onDev} />
    </AppRuntimeProvider>,
  );
  const footer = rendered.getByRole('button', { name: /ExcerLock 1.0.0/ });

  for (let tap = 0; tap < 7; tap += 1) await userEvent.press(footer);

  expect(onDev).not.toHaveBeenCalled();
  runtime.dispose();
});
