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
import { requestWinbackPaywall, resetWinbackSession, winbackShownThisSession } from '../winbackSession';

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
        localizedMonthlyPrice: null,
        periodUnit: 'year',
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

async function mountPaywall() {
  const runtime = createRuntime();
  await runtime.dev!.load('fresh-install');
  onboardingStore.getState().patch({ step: 'P', complete: true, setupComplete: false });
  entitlementStore.getState().patch({ entitlement: { status: 'none', renewsAt: null } });
  const loadPaywall = jest.fn(async (placement: SubscriptionPaywall['placement']) => paywall(placement));
  runtime.subscription.loadPaywall = loadPaywall;
  const routed = renderRouter({ _layout: layout(runtime), paywall: PaywallSlot }, { initialUrl: '/paywall' });
  await routed;
  return { runtime, loadPaywall, routed };
}

beforeEach(() => resetWinbackSession());

test('the onboarding hard paywall offers no decline and no close', async () => {
  const { loadPaywall } = await mountPaywall();
  await screen.findByRole('radio', { name: 'Annual · $29.99 / year' });
  expect(screen.queryByRole('button', { name: 'Not now' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  expect(loadPaywall).toHaveBeenCalledTimes(1);
  expect(loadPaywall).toHaveBeenCalledWith('onboarding');
});

test('a win-back placement that cannot load falls back to the original paywall', async () => {
  const runtime = createRuntime();
  await runtime.dev!.load('fresh-install');
  onboardingStore.getState().patch({ step: 'P', complete: true, setupComplete: false });
  entitlementStore.getState().patch({ entitlement: { status: 'none', renewsAt: null } });
  const loadPaywall = jest.fn(async (placement: SubscriptionPaywall['placement']) => {
    if (placement === 'winback') throw new Error('winback offline');
    return paywall(placement);
  });
  runtime.subscription.loadPaywall = loadPaywall;
  requestWinbackPaywall();
  const routed = renderRouter({ _layout: layout(runtime), paywall: PaywallSlot }, { initialUrl: '/paywall' });
  await routed;

  await waitFor(() =>
    expect(loadPaywall.mock.calls.map(([placement]) => placement)).toEqual(['winback', 'onboarding']),
  );
  // The failed placement never reports a view; the user is on the paywall they would have seen.
  expect(viewedPlacements(runtime).every((props) => (props as { placement: string }).placement === 'onboarding')).toBe(
    true,
  );
  expect(await screen.findByRole('radio', { name: 'Annual · $29.99 / year' })).toBeTruthy();
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
  expect(await screen.findByRole('radio', { name: 'Annual · $29.99 / year' })).toBeTruthy();
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
