import { render, screen, userEvent, act, cleanup } from '@testing-library/react-native';
import { SubscriptionScreen } from '../SubscriptionScreen';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { settingsCopy } from '../../../content/settings';
import { subscriptionCopy } from '../../../content/subscription';
jest.mock('expo-constants', () => ({ __esModule: true, default: { isDevice: false } }));
async function mount(runtime = createRuntime()) {
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <SubscriptionScreen onBack={() => {}} />
    </AppRuntimeProvider>,
  );
  return runtime;
}
test('restore shows pending feedback then Purchases restored or No active purchase found', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  let finish!: (value: Awaited<ReturnType<typeof runtime.subscription.restore>>) => void;
  runtime.subscription.restore = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  await mount(runtime);
  await userEvent.press(screen.getByRole('button', { name: 'Restore purchases' }));
  expect(screen.getByRole('button', { name: 'Restore purchases, Restoring purchases…' })).toBeTruthy();
  await act(async () => {
    finish({ status: 'active', renewsAt: null });
  });
  expect(screen.getByRole('alert')).toHaveTextContent(settingsCopy.restored);
  runtime.subscription.restore = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  await userEvent.press(screen.getByRole('button', { name: 'Restore purchases' }));
  expect(screen.getByRole('button', { name: 'Restore purchases, Restoring purchases…' })).toBeTruthy();
  await act(async () => {
    finish({ status: 'none', renewsAt: null });
  });
  expect(screen.getByRole('alert')).toHaveTextContent(settingsCopy.noRestore);
  runtime.dispose();
});
test.each(['expired', 'none', 'billingIssue'] as const)(
  '%s mounts Manage in App Store and Restore purchases without opening the paywall',
  async (status) => {
    const runtime = createRuntime();
    await runtime.dev.load('fresh-install');
    runtime.dev.setEntitlement(status);
    const present = jest.spyOn(
      runtime.subscription,
      `${'present'}${'Paywall'}` as keyof typeof runtime.subscription,
    );
    await mount(runtime);
    expect(screen.getByRole('button', { name: subscriptionCopy.manage })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Restore purchases' })).toBeTruthy();
    expect(present).not.toHaveBeenCalled();
    runtime.dispose();
    cleanup();
  },
);
test('manage shows the App Store fallback when the native management port fails', async () => {
  const runtime = createRuntime();
  runtime.subscription.manageSubscription = jest.fn().mockRejectedValue(new Error('unavailable'));
  await runtime.dev.load('fresh-install');
  await mount(runtime);
  await expect(userEvent.press(screen.getByRole('button', { name: subscriptionCopy.manage }))).resolves.toBeUndefined();
  expect(screen.getByRole('alert')).toHaveTextContent(subscriptionCopy.manageFallback);
  runtime.dispose();
});
