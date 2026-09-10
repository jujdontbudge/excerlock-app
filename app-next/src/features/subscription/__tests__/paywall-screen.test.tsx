import { Linking } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import type { SubscriptionPaywall } from '../../../ports/SubscriptionPort';
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
      <PaywallScreen placement="onboarding" />
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
