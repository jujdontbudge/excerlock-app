import { Linking } from 'react-native';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import type { PurchaseResult, SubscriptionPaywall } from '../../../ports/SubscriptionPort';
import { PaywallScreen } from '../PaywallScreen';

const paywall: SubscriptionPaywall = {
  placement: 'onboarding',
  title: 'Remote plan title',
  body: 'Remote plan body',
  flowVariationId: 'variation-b',
  generation: 9,
  products: [
    {
      handle: '9:odd.monthly',
      vendorProductId: 'odd.monthly',
      title: 'Flexible',
      detail: 'Monthly access',
      localizedPrice: '9,99 €',
      localizedPeriod: 'Monat',
      offerLabel: null,
      recommended: false,
    },
    {
      handle: '9:best.annual',
      vendorProductId: 'best.annual',
      title: 'Committed',
      detail: 'Annual access',
      localizedPrice: '79,99 €',
      localizedPeriod: 'Jahr',
      offerLabel: '14 Tage kostenlos',
      recommended: true,
    },
  ],
};

test('renders fetched product order and localized offer copy and opens legal links', async () => {
  const runtime = createRuntime();
  runtime.subscription.loadPaywall = jest.fn(async () => paywall);
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <PaywallScreen placement="onboarding" reportError={jest.fn()} />
    </AppRuntimeProvider>,
  );

  const choices = await screen.findAllByRole('radio');
  expect(choices.map((choice) => choice.props.accessibilityLabel)).toEqual(['Flexible', 'Committed']);
  expect(screen.getByText('9,99 € / Monat')).toBeTruthy();
  expect(screen.getByText('79,99 € / Jahr · 14 Tage kostenlos')).toBeTruthy();

  await userEvent.press(screen.getByRole('button', { name: 'Terms of Use' }));
  await userEvent.press(screen.getByRole('button', { name: 'Privacy Policy' }));
  expect(open).toHaveBeenNthCalledWith(1, 'https://excerlock.com/terms');
  expect(open).toHaveBeenNthCalledWith(2, 'https://excerlock.com/privacy');
  open.mockRestore();
});

test('shows, reports, and retries a paywall load failure', async () => {
  const runtime = createRuntime();
  const failure = new Error('network detail');
  runtime.subscription.loadPaywall = jest.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce(paywall);
  const reportError = jest.fn();
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <PaywallScreen placement="onboarding" reportError={reportError} />
    </AppRuntimeProvider>,
  );

  expect(await screen.findByText("Plans couldn't load. Please retry.")).toBeTruthy();
  expect(reportError).toHaveBeenCalledWith(failure, 'load');
  await userEvent.press(screen.getByRole('button', { name: 'Retry loading plans' }));
  await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(2));
});

test('shows progress while a purchase is pending instead of a frozen call to action', async () => {
  const runtime = createRuntime();
  runtime.subscription.loadPaywall = jest.fn(async () => paywall);
  let finish!: (value: PurchaseResult) => void;
  runtime.subscription.purchase = jest.fn(
    () => new Promise<PurchaseResult>((resolve) => { finish = resolve; }),
  );
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <PaywallScreen placement="onboarding" reportError={jest.fn()} />
    </AppRuntimeProvider>,
  );

  await screen.findAllByRole('radio');
  const start = screen.getByRole('button', { name: 'Continue' });
  expect(start).toBeEnabled();
  await userEvent.press(start);
  expect(await screen.findByText('Starting your plan…')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await act(async () => {
    finish({ type: 'success', entitlement: { status: 'active', renewsAt: null } });
  });
  await waitFor(() => expect(screen.queryByText('Starting your plan…')).toBeNull());
});

test('emits the client purchase-funnel events for the loaded placement and the CTA', async () => {
  const runtime = createRuntime();
  runtime.subscription.loadPaywall = jest.fn(async () => paywall);
  runtime.subscription.purchase = jest.fn(async () => ({ type: 'user_cancelled' as const }));
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <PaywallScreen placement="onboarding" reportError={jest.fn()} />
    </AppRuntimeProvider>,
  );

  await userEvent.press(await screen.findByRole('radio', { name: 'Committed' }));
  await userEvent.press(screen.getByRole('button', { name: 'Start free trial' }));
  await waitFor(() => expect(runtime.subscription.purchase).toHaveBeenCalledWith('9:best.annual'));

  const funnel = runtime.dev.snapshot().events.filter((event) => event.event.startsWith('paywall_viewed') || event.event === 'purchase_started');
  expect(funnel.map((event) => [event.event, event.props])).toEqual([
    ['paywall_viewed', { placement: 'onboarding', has_trial: true, variation_id: 'variation-b' }],
    ['purchase_started', { placement: 'onboarding', plan_id: 'best.annual' }],
  ]);
});
