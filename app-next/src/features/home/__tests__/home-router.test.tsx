import { Text } from 'react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { userEvent, act } from '@testing-library/react-native';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { RootNavigator } from '../../launch/RootNavigator';
import { BootGate } from '../../launch/BootGate';
import Tabs from '../../../../app/(tabs)/_layout';
import { HomeScreen } from '../HomeScreen';
import { TabPlaceholder } from '../TabPlaceholder';
import { hydrationReport, PersistError } from '../../../state/hydrationReport';

const appRoutes = (runtime: ReturnType<typeof createRuntime>) => ({
  _layout: () => (
    <AppRuntimeProvider runtime={runtime}>
      <RootNavigator />
    </AppRuntimeProvider>
  ),
  index: BootGate,
  '(tabs)/_layout': Tabs,
  '(tabs)/home': HomeScreen,
  '(tabs)/conditions': () => <TabPlaceholder tab="conditions" />,
  '(tabs)/analytics': () => <TabPlaceholder tab="analytics" />,
  '(tabs)/settings': () => <TabPlaceholder tab="settings" />,
  builder: () => <Text>Builder</Text>,
  paywall: () => <Text>Paywall</Text>,
  dev: () => <Text>Dev</Text>,
  'gym-picker': () => <Text>Gym picker</Text>,
  settings: () => <Text>Settings</Text>,
  'sign-in': () => <Text>Sign in</Text>,
  'unlock/gym': () => <Text>Gym unlock</Text>,
  'unlock/treadmill': () => <Text>Treadmill unlock</Text>,
  'onboarding/[step]': () => <Text>Onboarding</Text>,
  'setup/[step]': () => <Text>Setup</Text>,
});

test('entitled boot opens Home, tabs navigate and selected apps open the shared picker', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  const r = renderRouter(appRoutes(runtime), { initialUrl: '/' });
  const rendered = await r;
  expect(r.getPathname()).toBe('/home');
  expect(screen.getByRole('header', { name: 'Apps are blocked' })).toBeTruthy();
  expect(screen.getByText('Walk 5,000 steps')).toBeTruthy();
  expect(screen.getByRole('header', { name: /Block from 9.AM to 9.PM until you walk 5,000 steps/ })).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Edit / Add' }));
  expect(r.getPathname()).toBe('/conditions');
  await userEvent.press(screen.getByRole('tab', { name: 'Home' }));
  await userEvent.press(screen.getByRole('button', { name: /Lock list/ }));
  expect(screen.getByRole('header', { name: 'Choose apps to block' })).toBeTruthy();
  await act(() => runtime.dev.resolvePrompt(false));
  await rendered.unmount();
});

test.each(['home-locked-walking', 'home-unlocked-met', 'home-before-window'])(
  'Home renders no test-unlock buttons in %s',
  async (scenario) => {
    const runtime = createRuntime();
    await runtime.dev.load(scenario);
    const rendered = await renderRouter(appRoutes(runtime), { initialUrl: '/home' });

    expect(screen.queryByRole('button', { name: 'Test gym unlock' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Test treadmill unlock' })).toBeNull();

    rendered.unmount();
    runtime.dispose();
  },
);

test('Home shows the hydration notice once when rows were dropped and hides it after dismissal', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  hydrationReport.getState().clear();
  const rendered = await renderRouter(appRoutes(runtime), { initialUrl: '/home' });
  await act(async () => hydrationReport.getState().recordDropped('rules', 1));
  expect(hydrationReport.getState().droppedCount).toBe(1);

  expect(screen.getByRole('alert')).toHaveTextContent('Some saved data could not be read after the last update.');
  await userEvent.press(screen.getByRole('button', { name: 'Dismiss' }));
  expect(screen.queryByRole('alert')).toBeNull();

  await act(async () => {
    hydrationReport.getState().clear();
    hydrationReport.getState().recordWriteError(new PersistError('rules', new Error()));
  });
  expect(screen.getByRole('alert')).toHaveTextContent('A recent change could not be saved. Try it again.');

  rendered.unmount();
  runtime.dispose();
});
