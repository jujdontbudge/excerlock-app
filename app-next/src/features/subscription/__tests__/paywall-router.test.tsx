import { Slot, router } from 'expo-router';
import { act, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { RootNavigator } from '../../launch/RootNavigator';
import { BootGate } from '../../launch/BootGate';
import { OnboardingRoute } from '../../onboarding/OnboardingRoute';
import { PaywallSlot } from '../PaywallSlot';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { onboardingStore } from '../../../state/onboardingStore';
import { entitlementStore } from '../../../state/entitlementStore';
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
test('purchase stays busy for 800 ms, grants trial and resumes setup', async () => {
  const { result } = await mount();
  jest.useFakeTimers();
  await fireEvent.press(screen.getByRole('button', { name: 'Start free trial' }));
  expect(screen.getByRole('button', { name: 'Start free trial' })).toBeDisabled();
  await act(() => jest.advanceTimersByTime(799));
  expect(entitlementStore.getState().data.entitlement.status).toBe('none');
  await act(() => jest.advanceTimersByTime(1));
  expect(entitlementStore.getState().data.entitlement.status).toBe('trial');
  expect(result.getPathname()).toBe('/setup/X1');
});
test.each(['restored', 'notFound'] as const)('restore handles %s without real purchases', async (outcome) => {
  const { result, runtime } = await mount('trial-expired');
  await act(() => runtime.dev.setRestoreOutcome(outcome));
  jest.useFakeTimers();
  expect(screen.getByText('Your trial has ended. Choose a plan to keep going.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Restore purchases' }));
  await act(() => jest.advanceTimersByTime(800));
  if (outcome === 'restored') expect(result.getPathname()).toBe('/home');
  else expect(screen.getByText('No active purchase was found.')).toBeTruthy();
});
test('billing errors stay on the paywall and can retry', async () => {
  const { result, runtime } = await mount('billing-issue');
  await act(() => runtime.dev.setOutcome('error'));
  jest.useFakeTimers();
  expect(
    screen.getByText('There is a billing issue with your subscription. Restore access or choose a plan.'),
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Start free trial' }));
  await act(() => jest.advanceTimersByTime(800));
  expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
  expect(result.getPathname()).toBe('/paywall');
});
