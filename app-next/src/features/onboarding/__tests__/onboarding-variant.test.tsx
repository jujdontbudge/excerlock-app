import { act, userEvent, waitFor } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { OnboardingRoute } from '../OnboardingRoute';
import { onboardingStore } from '../../../state/onboardingStore';
import { entitlementStore } from '../../../state/entitlementStore';
import { hydrateStores } from '../../../state/stores';
import { onboardingCopy } from '../../../content/onboarding';
import { preBranch } from '../../../onboarding/flow';
import { createOnboardingFlowPort } from '../../../onboarding/flowOrder';
import { createRuntime } from '../../../runtime/createRuntime';
import type { Runtime } from '../../../runtime/Runtime';

const answers = {
  name: 'Alex',
  referralSource: 'friend',
  ageBand: '25–34',
  improveFirst: 'exercise',
  mainReason: 'focus',
  estimatedDailyMinutes: 180,
  activity: 'walking',
  walkingMode: 'steps',
};
const swapped = ['O01', 'O03', 'O02', ...preBranch.filter((step) => !['O01', 'O02', 'O03'].includes(step))];
const routes = (runtime: Runtime) => ({
  _layout: () => (
    <AppRuntimeProvider runtime={runtime}>
      <Slot />
    </AppRuntimeProvider>
  ),
  'onboarding/[step]': OnboardingRoute,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function mount(readPayload?: () => Promise<unknown>) {
  await hydrateStores();
  onboardingStore.getState().reset();
  onboardingStore.getState().patch({ step: 'O01', answers });
  entitlementStore.getState().reset();
  const runtime = createRuntime('fake');
  runtime.onboardingFlow = readPayload === undefined ? undefined : createOnboardingFlowPort({ readPayload });
  const routed = renderRouter(routes(runtime), { initialUrl: '/onboarding/O01' });
  await routed;
  // Wrapped: an async function would unwrap the thenable router result.
  return { routed };
}

test('a validated onboarding_variant payload reorders the steps the flow walks', async () => {
  const { routed } = await mount(async () => ({ preBranch: swapped }));
  await act(async () => {});
  expect(screen.getByRole('header', { name: onboardingCopy.O01.title })).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Get started' }));
  await waitFor(() => expect(routed.getPathname()).toBe('/onboarding/O03'));
  await userEvent.press(screen.getByRole('button', { name: 'Get started' }));
  await waitFor(() => expect(routed.getPathname()).toBe('/onboarding/O02'));
  await userEvent.press(screen.getByRole('button', { name: 'Get started' }));
  await waitFor(() => expect(routed.getPathname()).toBe('/onboarding/O07'));
  expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
});

test('the first render is bundled and never waits for the flag rail', async () => {
  const payload = deferred<unknown>();
  const { routed } = await mount(() => payload.promise);
  expect(screen.getByRole('header', { name: onboardingCopy.O01.title })).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Get started' }));
  await waitFor(() => expect(routed.getPathname()).toBe('/onboarding/O02'));
  await userEvent.press(screen.getByRole('button', { name: 'Back' }));
  await waitFor(() => expect(routed.getPathname()).toBe('/onboarding/O01'));
  await act(async () => {
    payload.resolve({ preBranch: swapped });
  });
  await userEvent.press(screen.getByRole('button', { name: 'Get started' }));
  await waitFor(() => expect(routed.getPathname()).toBe('/onboarding/O03'));
});

test.each([
  ['a malformed payload', async (): Promise<unknown> => ({ preBranch: ['O99'] })],
  ['an absent payload', async (): Promise<unknown> => undefined],
  ['a throwing read', async (): Promise<unknown> => {
    throw new Error('flags offline');
  }],
] as const)('%s keeps the bundled order', async (_label, readPayload) => {
  const { routed } = await mount(readPayload);
  await act(async () => {});
  await userEvent.press(screen.getByRole('button', { name: 'Get started' }));
  await waitFor(() => expect(routed.getPathname()).toBe('/onboarding/O02'));
});

test('a runtime with no flow port keeps the bundled order', async () => {
  const { routed } = await mount(undefined);
  await userEvent.press(screen.getByRole('button', { name: 'Get started' }));
  await waitFor(() => expect(routed.getPathname()).toBe('/onboarding/O02'));
});
