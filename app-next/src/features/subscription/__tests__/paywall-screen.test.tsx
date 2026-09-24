import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import type { PurchaseResult, SubscriptionPaywall } from '../../../ports/SubscriptionPort';
import { PaywallScreen } from '../PaywallScreen';
import { onboardingStore } from '../../../state/onboardingStore';

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
      localizedMonthlyPrice: '9,99 €',
      periodUnit: 'month',
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
      localizedMonthlyPrice: '6,67 €',
      periodUnit: 'year',
      // Realistic adapter output: `${numberOfPeriods} ${unit} free` (English, unlike
      // the store-localized price/period which may be any locale).
      offerLabel: '7 day free',
      recommended: true,
    },
  ],
};

test('renders fetched product order and localized offer copy', async () => {
  const runtime = createRuntime();
  runtime.subscription.loadPaywall = jest.fn(async () => paywall);
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <PaywallScreen placement="onboarding" reportError={jest.fn()} />
    </AppRuntimeProvider>,
  );

  const choices = await screen.findAllByRole('radio');
  expect(choices.map((choice) => choice.props.accessibilityLabel)).toEqual([
    'Flexible · 9,99 € / Monat',
    'Committed · 79,99 € / Jahr',
  ]);
  // Both plan cards compare per month and are named by how often they bill; the trial is a badge.
  expect(screen.getByText('Monthly')).toBeTruthy();
  expect(screen.getByText('9,99 €/mo')).toBeTruthy();
  expect(screen.getByText('Yearly')).toBeTruthy();
  expect(screen.getByText('6,67 €/mo')).toBeTruthy();
  expect(screen.getByText('7 day free trial')).toBeTruthy();
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
    () =>
      new Promise<PurchaseResult>((resolve) => {
        finish = resolve;
      }),
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

  await userEvent.press(await screen.findByRole('radio', { name: 'Committed · 79,99 € / Jahr' }));
  await userEvent.press(screen.getByRole('button', { name: 'Start for free' }));
  await waitFor(() => expect(runtime.subscription.purchase).toHaveBeenCalledWith('9:best.annual'));

  const funnel = runtime.dev
    .snapshot()
    .events.filter((event) => event.event.startsWith('paywall_viewed') || event.event === 'purchase_started');
  expect(funnel.map((event) => [event.event, event.props])).toEqual([
    ['paywall_viewed', { placement: 'onboarding', has_trial: true, variation_id: 'variation-b' }],
    ['purchase_started', { placement: 'onboarding', plan_id: 'best.annual' }],
  ]);
});

test('nothing under the button: no billed-price line and no legal links, on any placement', async () => {
  for (const placement of ['onboarding', 'winback'] as const) {
    const runtime = createRuntime();
    runtime.subscription.loadPaywall = jest.fn(async () => ({ ...paywall, placement }));
    await render(
      <AppRuntimeProvider runtime={runtime}>
        <PaywallScreen placement={placement} reportError={jest.fn()} />
      </AppRuntimeProvider>,
    );
    await screen.findAllByRole('radio');
    await userEvent.press(screen.getByRole('radio', { name: 'Committed · 79,99 € / Jahr' }));
    expect(screen.queryByText(/after 7 day free trial|Cancel anytime/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Terms of Use' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Privacy Policy' })).toBeNull();
    // The billed amount stays in the plan's spoken label.
    expect(screen.getByRole('radio', { name: 'Committed · 79,99 € / Jahr' })).toBeTruthy();
  }
});

test('when both plans carry a trial, both show the badge and the no-payment promise stays on either', async () => {
  const runtime = createRuntime();
  runtime.subscription.loadPaywall = jest.fn(async () => ({
    ...paywall,
    products: paywall.products.map((product) => ({ ...product, offerLabel: '7 day free' })),
  }));
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <PaywallScreen placement="onboarding" reportError={jest.fn()} />
    </AppRuntimeProvider>,
  );

  await screen.findAllByRole('radio');
  expect(screen.getAllByText('7 day free trial')).toHaveLength(2);
  for (const name of ['Flexible · 9,99 € / Monat', 'Committed · 79,99 € / Jahr']) {
    await userEvent.press(screen.getByRole('radio', { name }));
    expect(screen.getByText('No payment due now')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start for free' })).toBeTruthy();
  }
});

test('the header carries only back and Restore: no app name over the paywall', async () => {
  const runtime = createRuntime();
  runtime.subscription.loadPaywall = jest.fn(async () => paywall);
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <PaywallScreen placement="onboarding" reportError={jest.fn()} onBack={jest.fn()} />
    </AppRuntimeProvider>,
  );
  await screen.findAllByRole('radio');
  expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Restore purchases' })).toBeTruthy();
  expect(screen.queryByText('ExcerLock')).toBeNull();
  expect(screen.queryByRole('header', { name: 'ExcerLock' })).toBeNull();
});

test('sells the dreams the user chose in onboarding and promises no payment today on a trial', async () => {
  onboardingStore
    .getState()
    .patch({ answers: { bodyGoal: 'lose', improveFirst: 'screenTime', estimatedDailyMinutes: 180 } });
  const runtime = createRuntime();
  runtime.subscription.loadPaywall = jest.fn(async () => paywall);
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <PaywallScreen placement="onboarding" reportError={jest.fn()} />
    </AppRuntimeProvider>,
  );

  await screen.findAllByRole('radio');
  expect(screen.getByText('Lose the body fat and feel light again')).toBeTruthy();
  expect(screen.getByText('Break free from endless scrolling')).toBeTruthy();
  expect(screen.getByText('Win back 46 days a year for what matters')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Restore purchases' })).toBeTruthy();
  // No trial on the monthly plan, so no promise that nothing is charged today.
  expect(screen.queryByText('No payment due now')).toBeNull();
  await userEvent.press(screen.getByRole('radio', { name: 'Committed · 79,99 € / Jahr' }));
  expect(screen.getByText('No payment due now')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Start for free' })).toBeTruthy();
});
