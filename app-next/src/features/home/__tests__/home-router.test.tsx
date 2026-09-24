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
test('entitled boot opens Home, tabs navigate and selected apps open the shared picker', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  const r = renderRouter(
    {
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
      'onboarding/[step]': () => <Text>Onboarding</Text>,
      'setup/[step]': () => <Text>Setup</Text>,
    },
    { initialUrl: '/' },
  );
  const rendered = await r;
  expect(r.getPathname()).toBe('/home');
  expect(screen.queryByRole('header', { name: 'Conditions' })).toBeNull();
  expect(screen.getByText('Walk 5,000 steps')).toBeTruthy();
  expect(screen.getByLabelText('Locked')).toBeTruthy();
  expect(screen.getByRole('header', { name: /Apps blocked until/ })).toBeTruthy();
  expect(screen.getByText(/Mon.*9.AM.*9.PM/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Edit / Add' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Choose apps' })).toBeNull();
  await userEvent.press(screen.getByRole('button', { name: 'Lock list' }));
  expect(screen.getByRole('header', { name: 'Choose apps to block' })).toBeTruthy();
  await act(() => runtime.dev.resolvePrompt(false));
  await rendered.unmount();
});

test('unsupported schedule replaces normal lock claims with a reachable repair action', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  const snapshot = { ...runtime.status.snapshot(), scheduleIssue: { reason: 'nativeWindowLimit' as const, required: 14 } };
  jest.spyOn(runtime.status, 'snapshot').mockReturnValue(snapshot);
  const r = renderRouter({
    _layout: () => <AppRuntimeProvider runtime={runtime}><RootNavigator /></AppRuntimeProvider>,
    index: BootGate,
    '(tabs)/_layout': Tabs,
    '(tabs)/home': HomeScreen,
    '(tabs)/conditions': () => <TabPlaceholder tab="conditions" />,
    '(tabs)/analytics': () => <TabPlaceholder tab="analytics" />,
    '(tabs)/settings': () => <TabPlaceholder tab="settings" />,
  }, { initialUrl: '/home' });
  const rendered = await r;
  expect(screen.getByText('Your schedule needs attention')).toBeTruthy();
  expect(screen.queryByLabelText('Locked')).toBeNull();
  expect(screen.queryByRole('header', { name: /Apps blocked until/ })).toBeNull();
  await userEvent.press(screen.getByRole('button', { name: 'Review conditions' }));
  expect(r.getPathname()).toBe('/conditions');
  await rendered.unmount();
  runtime.dispose();
});
