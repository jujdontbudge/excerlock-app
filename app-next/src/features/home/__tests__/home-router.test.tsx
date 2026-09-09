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
  expect(screen.getByRole('header', { name: 'Conditions' })).toBeTruthy();
  expect(screen.getByText('Walk 5,000 steps')).toBeTruthy();
  expect(screen.getByRole('header', { name: 'Locked' })).toBeTruthy();
  expect(screen.getByText('Complete a condition to unlock')).toBeTruthy();
  expect(screen.getByText(/Mon.*9.AM.*9.PM/)).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Edit / Add' }));
  expect(r.getPathname()).toBe('/conditions');
  await userEvent.press(screen.getByRole('tab', { name: 'Home' }));
  await userEvent.press(screen.getByRole('button', { name: 'Lock list' }));
  expect(screen.getByRole('header', { name: 'Choose apps to block' })).toBeTruthy();
  await act(() => runtime.dev.resolvePrompt(false));
  await rendered.unmount();
});
