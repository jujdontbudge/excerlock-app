import { Slot, router } from 'expo-router';
import { act, fireEvent, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { RootNavigator } from '../../launch/RootNavigator';
import { BootGate } from '../../launch/BootGate';
import { OnboardingRoute } from '../../onboarding/OnboardingRoute';
import { PaywallSlot } from '../PaywallSlot';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { onboardingStore } from '../../../state/onboardingStore';
import { entitlementStore } from '../../../state/entitlementStore';
import { SettingsScreen } from '../../settings/SettingsScreen';
import { AccountScreen } from '../../settings/AccountScreen';
import { settingsCopy } from '../../../content/settings';
async function mount(scenario = 'fresh-install', initialUrl = '/paywall') {
  const runtime = createRuntime();
  await runtime.dev.load(scenario);
  if (initialUrl === '/paywall') onboardingStore.getState().patch({ step: 'P', complete: true });
  const routes = {
    _layout: () => (
      <AppRuntimeProvider runtime={runtime}>
        <RootNavigator />
      </AppRuntimeProvider>
    ),
    index: BootGate,
    'onboarding/[step]': OnboardingRoute,
    paywall: PaywallSlot,
    'setup/[step]': () => <Text>Setup</Text>,
    '(tabs)/_layout': () => <Slot />,
    builder: () => <Text>Builder</Text>,
    '(tabs)/home': () => <Text>Home</Text>,
    '(tabs)/settings': () => <SettingsScreen navigate={(path) => router.push(`/settings/${path}` as never)} />,
    'settings/_layout': () => <Slot />,
    'settings/account': () => <AccountScreen onBack={() => router.back()} onSignIn={() => {}} />,
    dev: () => <Text>Dev</Text>,
  };
  const result = renderRouter(routes, { initialUrl });
  await result;
  return { result, runtime };
}
afterEach(() => jest.useRealTimers());
test('hard paywall removes onboarding history and refuses back navigation', async () => {
  const { result } = await mount('fresh-install', '/onboarding/T4');
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(result.getPathname()).toBe('/paywall');
  expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  expect(router.canGoBack()).toBe(false);
  try {
    await act(async () => {
      router.back();
      await Promise.resolve();
    });
  } catch (error) {
    expect(String(error)).toContain('GO_BACK');
  }
  expect(result.getPathname()).toBe('/paywall');
});
test.each(['expired', 'billingIssue', 'unknown'] as const)(
  'completed setup with %s entitlement boots home and keeps account deletion reachable',
  async (status) => {
    const runtime = createRuntime();
    await runtime.dev.load('trial-expired');
    onboardingStore.getState().patch({ complete: true, setupComplete: true, setupStep: 'done' });
    entitlementStore.getState().patch({ entitlement: { status, renewsAt: null } });
    const routes = {
      _layout: () => (
        <AppRuntimeProvider runtime={runtime}>
          <RootNavigator />
        </AppRuntimeProvider>
      ),
      index: BootGate,
      paywall: PaywallSlot,
      '(tabs)/_layout': () => <Slot />,
      '(tabs)/home': () => <Text>Home</Text>,
      '(tabs)/settings': () => (
        <SettingsScreen navigate={(path: string) => router.push(`/settings/${path}` as never)} />
      ),
      'settings/_layout': () => <Slot />,
      'settings/account': () => <AccountScreen onBack={() => router.back()} onSignIn={() => {}} />,
    };
    const routed = renderRouter(routes, { initialUrl: '/' });
    await routed;
    expect(routed.getPathname()).toBe('/home');
    await act(async () => router.push('/settings'));
    await waitFor(() => expect(routed.getPathname()).toBe('/settings'));
    expect(screen.getByRole('button', { name: settingsCopy.supportRow })).toBeTruthy();
    expect(screen.getByRole('button', { name: settingsCopy.exportData })).toBeTruthy();
    await userEvent.press(screen.getByRole('button', { name: 'Alex' }));
    await waitFor(() => expect(routed.getPathname()).toBe('/settings/account'));
    await userEvent.press(screen.getByRole('button', { name: settingsCopy.delete }));
    await userEvent.press(screen.getByRole('button', { name: settingsCopy.deleteConfirm }));
    expect(await screen.findByText(settingsCopy.deleted)).toBeTruthy();
  },
);

test('a lapse transition presents one dismissible notice instead of repeatedly trapping the user', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('trial-active');
  onboardingStore.getState().patch({ complete: true, setupComplete: true, setupStep: 'done' });
  entitlementStore.getState().patch({ entitlement: { status: 'active', renewsAt: null } });
  const routes = {
    _layout: () => (
      <AppRuntimeProvider runtime={runtime}>
        <RootNavigator />
      </AppRuntimeProvider>
    ),
    index: BootGate,
    paywall: PaywallSlot,
    '(tabs)/_layout': () => <Slot />,
    '(tabs)/home': () => <Text>Home</Text>,
  };
  const routed = renderRouter(routes, { initialUrl: '/' });
  await routed;
  await act(async () => entitlementStore.getState().patch({ entitlement: { status: 'expired', renewsAt: null } }));
  await waitFor(() => expect(routed.getPathname()).toBe('/paywall'));
  await userEvent.press(screen.getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(routed.getPathname()).toBe('/home'));
  await act(async () => entitlementStore.getState().patch({ entitlement: { status: 'expired', renewsAt: null } }));
  expect(routed.getPathname()).toBe('/home');
});

test.each(['expired', 'billingIssue', 'unknown'] as const)(
  'completed setup can dismiss the in-app paywall with %s entitlement',
  async (status) => {
    const runtime = createRuntime();
    await runtime.dev.load('trial-expired');
    onboardingStore.getState().patch({ complete: true, setupComplete: true, setupStep: 'done' });
    entitlementStore.getState().patch({ entitlement: { status, renewsAt: null } });
    const routes = {
      _layout: () => (
        <AppRuntimeProvider runtime={runtime}>
          <RootNavigator />
        </AppRuntimeProvider>
      ),
      index: BootGate,
      paywall: PaywallSlot,
      '(tabs)/_layout': () => <Slot />,
      '(tabs)/home': () => <Text>Home</Text>,
    };
    const routed = renderRouter(routes, { initialUrl: '/paywall' });
    await routed;
    await userEvent.press(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(routed.getPathname()).toBe('/home'));
  },
);
test('purchase uses the selected fetched product, grants trial and resumes setup', async () => {
  const { result } = await mount();
  await fireEvent.press(await screen.findByRole('button', { name: 'Start free trial' }));
  await act(async () => {});
  expect(entitlementStore.getState().data.entitlement.status).toBe('trial');
  expect(result.getPathname()).toBe('/setup/X1');
});
test.each(['restored', 'notFound'] as const)('restore handles %s without real purchases', async (outcome) => {
  const { result, runtime } = await mount('trial-expired');
  await act(() => runtime.dev.setRestoreOutcome(outcome));
  expect(screen.getByText('Your trial has ended. Choose a plan to keep going.')).toBeTruthy();
  const restoreButton = await screen.findByRole('button', { name: 'Restore purchases' });
  await waitFor(() => expect(restoreButton).toBeEnabled());
  await userEvent.press(restoreButton);
  if (outcome === 'restored') {
    await waitFor(() => expect(result.getPathname()).toBe('/home'));
  } else {
    expect(await screen.findByText('No active purchase was found.')).toBeTruthy();
  }
});
test('billing errors stay on the paywall and can retry', async () => {
  const { result, runtime } = await mount('billing-issue');
  await act(() => runtime.dev.setOutcome('error'));
  expect(
    screen.getByText('There is a billing issue with your subscription. Restore access or choose a plan.'),
  ).toBeTruthy();
  await userEvent.press(await screen.findByRole('button', { name: 'Start free trial' }));
  await act(async () => {});
  expect(screen.getByText('Purchase could not finish. Please retry.')).toBeTruthy();
  expect(result.getPathname()).toBe('/paywall');
});
