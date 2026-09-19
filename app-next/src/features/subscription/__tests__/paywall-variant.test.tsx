import { Slot } from 'expo-router';
import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { PaywallSlot } from '../PaywallSlot';
import { onboardingStore } from '../../../state/onboardingStore';
import { entitlementStore } from '../../../state/entitlementStore';
import type { SubscriptionPaywall } from '../../../ports/SubscriptionPort';
import type { PaywallVariant } from '../../../runtime/analytics/PostHogAnalyticsAdapter';

/** The recommended plan is second on purpose: the variant changes the preselect. */
const paywall: SubscriptionPaywall = {
  placement: 'onboarding',
  title: 'Choose your plan',
  body: 'Remote body',
  flowVariationId: 'variation-b',
  generation: 7,
  products: [
    {
      handle: 'fake:monthly',
      vendorProductId: 'fake.monthly',
      title: 'Monthly',
      detail: '',
      localizedPrice: '$9.99',
      localizedPeriod: 'month',
      offerLabel: null,
      recommended: false,
    },
    {
      handle: 'fake:annual',
      vendorProductId: 'fake.annual',
      title: 'Annual',
      detail: '',
      localizedPrice: '$49.99',
      localizedPeriod: 'year',
      offerLabel: '7 days free',
      recommended: true,
    },
  ],
};

async function mount(variant: PaywallVariant | null | (() => Promise<PaywallVariant>)) {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  onboardingStore.getState().patch({ step: 'P', complete: true });
  entitlementStore.getState().patch({ entitlement: { status: 'none', renewsAt: null } });
  runtime.subscription.loadPaywall = jest.fn(async () => paywall);
  const exposure = jest.fn();
  if (variant === null) runtime.experiments = undefined;
  else {
    runtime.experiments = {
      getPaywallVariant: typeof variant === 'function' ? variant : async () => variant,
      trackPaywallVariantExposure: exposure,
    };
  }
  const routed = renderRouter(
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
  await routed;
  return { runtime, exposure, routed };
}

test('a variant_b assignment preselects the recommended plan and exposes the loaded flow variation once', async () => {
  const { runtime, exposure } = await mount('variant_b');
  const choices = await screen.findAllByRole('radio');
  expect(choices.map((choice) => choice.props.accessibilityLabel)).toEqual(['Monthly · $9.99 / month', 'Annual · $49.99 / year']);
  await waitFor(() => expect(choices[1].props.accessibilityState.checked).toBe(true));
  expect(choices[0].props.accessibilityState.checked).toBe(false);
  expect(exposure).toHaveBeenCalledTimes(1);
  expect(exposure).toHaveBeenCalledWith({
    variant: 'variant_b',
    placement: 'onboarding',
    flowVariationId: 'variation-b',
    generation: runtime.auth.identity().generation,
  });
  // A later interaction must not re-expose the same mounted placement.
  await userEvent.press(choices[0]);
  expect(choices[0].props.accessibilityState.checked).toBe(true);
  expect(exposure).toHaveBeenCalledTimes(1);
});

test('control keeps the remote catalog order and still exposes once per placement', async () => {
  const { runtime, exposure } = await mount('control');
  const choices = await screen.findAllByRole('radio');
  await waitFor(() => expect(choices[0].props.accessibilityState.checked).toBe(true));
  expect(exposure).toHaveBeenCalledTimes(1);
  expect(exposure).toHaveBeenCalledWith({
    variant: 'control',
    placement: 'onboarding',
    flowVariationId: 'variation-b',
    generation: runtime.auth.identity().generation,
  });
});

test('a failing variant read falls back to control instead of blocking the paywall', async () => {
  const { exposure } = await mount(async () => {
    throw new Error('flags offline');
  });
  const choices = await screen.findAllByRole('radio');
  expect(choices[0].props.accessibilityState.checked).toBe(true);
  await waitFor(() => expect(exposure).toHaveBeenCalledTimes(1));
  expect(exposure.mock.calls[0][0]).toEqual(expect.objectContaining({ variant: 'control' }));
});

test('a runtime with no experiment port renders control and exposes nothing', async () => {
  const { exposure } = await mount(null);
  const choices = await screen.findAllByRole('radio');
  expect(choices[0].props.accessibilityState.checked).toBe(true);
  expect(exposure).not.toHaveBeenCalled();
});

test('the paywall renders while the variant is still pending', async () => {
  let release!: (variant: PaywallVariant) => void;
  const pending = new Promise<PaywallVariant>((resolve) => {
    release = resolve;
  });
  const { exposure } = await mount(() => pending);
  const choices = await screen.findAllByRole('radio');
  expect(choices[0].props.accessibilityState.checked).toBe(true);
  expect(exposure).not.toHaveBeenCalled();
  release('variant_b');
  await waitFor(() => expect(choices[1].props.accessibilityState.checked).toBe(true));
  await waitFor(() => expect(exposure).toHaveBeenCalledTimes(1));
});
