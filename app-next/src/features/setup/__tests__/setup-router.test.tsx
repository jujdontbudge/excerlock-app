import type { ComponentProps } from 'react';
import { Slot } from 'expo-router';
import { Text } from 'react-native';
import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { RootNavigator } from '../../launch/RootNavigator';
import { BootGate } from '../../launch/BootGate';
import { SetupRoute } from '../SetupRoute';
import { createRuntime } from '../../../runtime/createRuntime';
import { onboardingStore } from '../../../state/onboardingStore';
import { emptyPermissions, permissionsStore } from '../../../state/permissionsStore';
import { rulesStore } from '../../../state/rulesStore';

jest.mock('../../../motion/haptics', () => ({ feedback: jest.fn() }));
const routes = (runtime: ComponentProps<typeof AppRuntimeProvider>['runtime']) => ({
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
});

test('a subscriber who has not finished setup signs in, sees each permission, then lands home', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('walk-state-ready');
  onboardingStore.getState().patch({ setupComplete: false, setupStep: 'X1' });
  permissionsStore.getState().patch(emptyPermissions);
  rulesStore.getState().patch({ lockedApps: { handle: null, isEmpty: true } });
  const screens: string[] = [];
  jest.spyOn(runtime.analytics, 'screen').mockImplementation((name) => void screens.push(name));
  const result = renderRouter(routes(runtime), { initialUrl: '/' });
  await result;
  await waitFor(() => expect(result.getPathname()).toBe('/setup/account'));
  expect(screen.getByRole('header', { name: 'Save your progress' })).toBeTruthy();
  await userEvent.press(await screen.findByRole('button', { name: 'Skip for now' }));
  for (const [step, title] of [
    ['apps', 'Choose apps to lock'],
    ['motion', 'Count your steps'],
    ['location', 'Unlock apps as you walk'],
  ]) {
    await waitFor(() => expect(result.getPathname()).toBe(`/setup/${step}`));
    expect(screen.getByRole('header', { name: title })).toBeTruthy();
    await userEvent.press(screen.getByRole('button', { name: 'Not now' }));
  }
  await waitFor(() => expect(result.getPathname()).toBe('/home'));
  expect(screens).toContain('/setup/done');
  expect(onboardingStore.getState().data).toMatchObject({ complete: true, setupComplete: true, setupStep: 'done' });
  runtime.dispose();
});

test('a signed-in subscriber with everything on goes straight home', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('signed-in-apple');
  onboardingStore.getState().patch({ setupComplete: false, setupStep: 'X1' });
  permissionsStore
    .getState()
    .patch({ ...emptyPermissions, screenTime: 'granted', motion: 'granted', location: 'always' });
  rulesStore.getState().patch({ lockedApps: { handle: null, isEmpty: false } });
  const result = renderRouter(routes(runtime), { initialUrl: '/setup/X1' });
  await result;
  await waitFor(() => expect(result.getPathname()).toBe('/home'));
  expect(onboardingStore.getState().data.setupComplete).toBe(true);
  runtime.dispose();
});
