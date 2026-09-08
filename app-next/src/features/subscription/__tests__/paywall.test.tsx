import { render, screen, userEvent } from '@testing-library/react-native';
import { PaywallStandIn } from '../PaywallStandIn';
import { Slot } from 'expo-router';
import { act, fireEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { PaywallSlot } from '../PaywallSlot';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';

const renderPaywall = (selected: 'annual' | 'monthly' = 'annual') =>
  render(
    <PaywallStandIn
      selected={selected}
      onSelect={() => {}}
      busy={null}
      message=""
      onStart={() => {}}
      onRestore={() => {}}
    />,
  );

test('the paywall offers exactly Annual and Monthly with plan-aware CTA copy', async () => {
  await renderPaywall('monthly');
  expect(screen.getAllByRole('radio').map((row) => row.props.accessibilityLabel)).toEqual(['Annual', 'Monthly']);
  expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Start free trial' })).toBeNull();
  expect(screen.queryByText('Lifetime')).toBeNull();
});

test('the paywall renders legal documents as buttons and opens Privacy Policy', async () => {
  await renderPaywall();
  expect(screen.getByRole('button', { name: 'Terms of Use' })).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Privacy Policy' }));
  expect(screen.getByRole('header', { name: 'Privacy Policy' })).toBeTruthy();
});

test('the paywall renders price and renewal disclosure', async () => {
  await renderPaywall();
  expect(screen.getByText('$–.–– / year · 7-day free trial')).toBeTruthy();
  expect(
    screen.getByText(
      'Subscriptions renew automatically unless canceled. Manage or cancel your subscription in your App Store account.',
    ),
  ).toBeTruthy();
});

test.each(['purchase', 'restore'] as const)('a failed %s while offline shows offline copy', async (action) => {
  const runtime = createRuntime();
  await runtime.dev.load('trial-expired');
  runtime.dev.setOnline(false);
  runtime.dev.setOutcome('error');
  await renderRouter(
    {
      _layout: () => (
        <AppRuntimeProvider runtime={runtime}>
          <Slot />
        </AppRuntimeProvider>
      ),
      paywall: PaywallSlot,
    },
    { initialUrl: '/paywall' },
  );
  jest.useFakeTimers();
  await fireEvent.press(
    screen.getByRole('button', { name: action === 'purchase' ? 'Start free trial' : 'Restore purchases' }),
  );
  await act(() => jest.advanceTimersByTime(800));
  expect(screen.getByText("You're offline. Connect and try again — this will not retry on its own.")).toBeTruthy();
  expect(screen.queryByText('Something went wrong. Please try again.')).toBeNull();
  jest.useRealTimers();
  runtime.dispose();
});
