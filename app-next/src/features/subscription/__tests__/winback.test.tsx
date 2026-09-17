import { Slot } from 'expo-router';
import { act, userEvent } from '@testing-library/react-native';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime, type Runtime } from '../../../runtime/createRuntime';
import { PaywallSlot } from '../PaywallSlot';
import { HomeScreen } from '../../home/HomeScreen';
import { RootNavigator } from '../../launch/RootNavigator';
import { BootGate } from '../../launch/BootGate';
import { onboardingStore } from '../../../state/onboardingStore';
import { entitlementStore } from '../../../state/entitlementStore';
import type { SubscriptionPaywall } from '../../../ports/SubscriptionPort';
import { resetWinbackSession, winbackShownThisSession } from '../winbackSession';

function paywall(placement: SubscriptionPaywall['placement']): SubscriptionPaywall {
  return {
    placement,
    title: placement === 'winback' ? 'Keep your access' : 'Choose your plan',
    body: '',
    flowVariationId: `${placement}-variation`,
    generation: placement === 'winback' ? 2 : 1,
    products: [
      {
        handle: 'fake:annual',
        vendorProductId: 'fake.annual',
        title: 'Annual',
        detail: '',
        localizedPrice: '$29.99',
        localizedPeriod: 'year',
        offerLabel: '7 days free',
        recommended: true,
      },
    ],
  };
}

function layout(runtime: Runtime) {
  const Layout = () => (
    <AppRuntimeProvider runtime={runtime}>
      <Slot />
    </AppRuntimeProvider>
  );
  return Layout;
}

function viewedPlacements(runtime: Runtime): unknown[] {
  return runtime
    .dev!.snapshot()
    .events.filter((event) => event.event === 'paywall_viewed')
    .map((event) => event.props);
}

async function mountPaywall(winbackDeclined = false) {
  const runtime = createRuntime();
  await runtime.dev!.load('fresh-install');
  onboardingStore.getState().patch({ step: 'P', complete: true, setupComplete: false, winbackDeclined });
  entitlementStore.getState().patch({ entitlement: { status: 'none', renewsAt: null } });
  const loadPaywall = jest.fn(async (placement: SubscriptionPaywall['placement']) => paywall(placement));
  runtime.subscription.loadPaywall = loadPaywall;
  const routed = renderRouter({ _layout: layout(runtime), paywall: PaywallSlot }, { initialUrl: '/paywall' });
  await routed;
  return { runtime, loadPaywall, routed };
}

beforeEach(() => resetWinbackSession());

test('the onboarding hard paywall declines into the win-back placement once', async () => {
  const { runtime, loadPaywall } = await mountPaywall();
  const decline = await screen.findByRole('button', { name: 'Not now' });
  await screen.findByRole('radio', { name: 'Annual' });
  expect(viewedPlacements(runtime)).toEqual([
    { placement: 'onboarding', has_trial: true, variation_id: 'onboarding-variation' },
  ]);
  await waitFor(() => expect(decline).toBeEnabled());
  await userEvent.press(decline);
  await waitFor(() => expect(loadPaywall).toHaveBeenCalledWith('winback'));
  await waitFor(() =>
    expect(viewedPlacements(runtime)).toEqual([
      { placement: 'onboarding', has_trial: true, variation_id: 'onboarding-variation' },
      { placement: 'winback', has_trial: true, variation_id: 'winback-variation' },
    ]),
  );
  expect(onboardingStore.getState().data.winbackDeclined).toBe(true);
  // One decline per install: the action is spent, and the hard wall has no close.
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Not now' })).toBeNull());
  expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
});

test('an install that already spent its decline never offers it again', async () => {
  const { loadPaywall } = await mountPaywall(true);
  await screen.findByRole('radio', { name: 'Annual' });
  expect(screen.queryByRole('button', { name: 'Not now' })).toBeNull();
  expect(loadPaywall).toHaveBeenCalledTimes(1);
  expect(loadPaywall).toHaveBeenCalledWith('onboarding');
});

test('a win-back placement that cannot load falls back to the original paywall', async () => {
  const runtime = createRuntime();
  await runtime.dev!.load('fresh-install');
  onboardingStore.getState().patch({ step: 'P', complete: true, setupComplete: false, winbackDeclined: false });
  entitlementStore.getState().patch({ entitlement: { status: 'none', renewsAt: null } });
  const loadPaywall = jest.fn(async (placement: SubscriptionPaywall['placement']) => {
    if (placement === 'winback') throw new Error('winback offline');
    return paywall(placement);
  });
  runtime.subscription.loadPaywall = loadPaywall;
  const routed = renderRouter({ _layout: layout(runtime), paywall: PaywallSlot }, { initialUrl: '/paywall' });
  await routed;

  const decline = await screen.findByRole('button', { name: 'Not now' });
  await waitFor(() => expect(decline).toBeEnabled());
  await userEvent.press(decline);

  await waitFor(() =>
    expect(loadPaywall.mock.calls.map(([placement]) => placement)).toEqual(['onboarding', 'winback', 'onboarding']),
  );
  // The failed placement never reports a view; the user is back on the paywall.
  expect(viewedPlacements(runtime).every((props) => (props as { placement: string }).placement === 'onboarding')).toBe(
    true,
  );
  expect(await screen.findByRole('radio', { name: 'Annual' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Not now' })).toBeNull();
  expect(
    runtime.dev!.snapshot().events.some((event) => event.event === 'paywall_error' && event.props.operation === 'load'),
  ).toBe(true);
});

test('a cold start that is already lapsed offers the win-back paywall once per session', async () => {
  const runtime = createRuntime();
  await runtime.dev!.load('trial-expired');
  const loadPaywall = jest.fn(async (placement: SubscriptionPaywall['placement']) => paywall(placement));
  runtime.subscription.loadPaywall = loadPaywall;
  const routed = renderRouter(
    { _layout: layout(runtime), home: HomeScreen, paywall: PaywallSlot },
    { initialUrl: '/home' },
  );
  await routed;

  await waitFor(() => expect(routed.getPathname()).toBe('/paywall'));
  await waitFor(() => expect(loadPaywall).toHaveBeenCalledWith('winback'));
  expect(winbackShownThisSession()).toBe(true);
  // Setup is complete, so the lapsed surface is dismissible.
  await userEvent.press(await screen.findByRole('button', { name: 'Close' }));
  await waitFor(() => expect(routed.getPathname()).toBe('/home'));
  // Home re-evaluates on the way back and the session rail stops the loop.
  await act(async () => {});
  expect(routed.getPathname()).toBe('/home');
  expect(loadPaywall.mock.calls.filter(([placement]) => placement === 'winback')).toHaveLength(1);
});

test('the production navigator turns a lapsed cold start into the win-back paywall', async () => {
  const runtime = createRuntime();
  await runtime.dev!.load('trial-expired');
  const loadPaywall = jest.fn(async (placement: SubscriptionPaywall['placement']) => paywall(placement));
  runtime.subscription.loadPaywall = loadPaywall;
  const routed = renderRouter(
    {
      _layout: () => (
        <AppRuntimeProvider runtime={runtime}>
          <RootNavigator />
        </AppRuntimeProvider>
      ),
      index: BootGate,
      '(tabs)/_layout': () => <Slot />,
      '(tabs)/home': HomeScreen,
      paywall: PaywallSlot,
    },
    { initialUrl: '/' },
  );
  const rendered = await routed;
  await waitFor(() => expect(routed.getPathname()).toBe('/paywall'));
  await waitFor(() => expect(loadPaywall).toHaveBeenCalledWith('winback'));
  expect(await screen.findByRole('radio', { name: 'Annual' })).toBeTruthy();
  await rendered.unmount();
});

test('a lapse while Home is open is left to the root guard instead of stacking a paywall', async () => {
  const runtime = createRuntime();
  await runtime.dev!.load('trial-active');
  const loadPaywall = jest.fn(async (placement: SubscriptionPaywall['placement']) => paywall(placement));
  runtime.subscription.loadPaywall = loadPaywall;
  const routed = renderRouter(
    { _layout: layout(runtime), home: HomeScreen, paywall: PaywallSlot },
    { initialUrl: '/home' },
  );
  await routed;
  expect(routed.getPathname()).toBe('/home');
  await act(async () => entitlementStore.getState().patch({ entitlement: { status: 'expired', renewsAt: null } }));
  await act(async () => {});
  expect(routed.getPathname()).toBe('/home');
  expect(loadPaywall).not.toHaveBeenCalled();
});

test.each(['none', 'active', 'trial', 'billingIssue', 'unknown'] as const)(
  'a %s entitlement keeps Home in place instead of offering the win-back',
  async (status) => {
    const runtime = createRuntime();
    await runtime.dev!.load('trial-expired');
    entitlementStore.getState().patch({ entitlement: { status, renewsAt: null } });
    const loadPaywall = jest.fn(async (placement: SubscriptionPaywall['placement']) => paywall(placement));
    runtime.subscription.loadPaywall = loadPaywall;
    const routed = renderRouter(
      { _layout: layout(runtime), home: HomeScreen, paywall: PaywallSlot },
      { initialUrl: '/home' },
    );
    await routed;
    await act(async () => {});
    expect(routed.getPathname()).toBe('/home');
    expect(loadPaywall).not.toHaveBeenCalled();
  },
);
