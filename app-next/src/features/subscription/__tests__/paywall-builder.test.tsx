import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PaywallSlot } from '../PaywallSlot';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { Runtime } from '../../../runtime/Runtime';
import { onboardingStore } from '../../../state/onboardingStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  router: { push: jest.fn() },
}));

type MountOptions = { paywall?: Runtime['paywall']; setupComplete?: boolean; outcome?: 'success' | 'cancel' | 'error' };

async function mount({ paywall = 'standIn', setupComplete = false, outcome = 'success' }: MountOptions = {}) {
  const base = createRuntime();
  await base.dev.load('fresh-install');
  base.dev.setOutcome(outcome);
  onboardingStore.getState().patch({ setupComplete });
  const runtime = { ...base, paywall } as Runtime;
  const present = jest.spyOn(runtime.subscription, 'presentPaywall');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <PaywallSlot />
    </AppRuntimeProvider>,
  );
  return { runtime, present };
}

test('the stand-in waits for a tap, because there is no paywall to open', async () => {
  const { present } = await mount();
  expect(present).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Start free trial' })).toBeTruthy();
});

test('a Builder build opens the paywall itself rather than asking for a tap', async () => {
  const { present } = await mount({ paywall: 'builder' });
  expect(present).toHaveBeenCalledWith('onboarding', 'annual');
});

test('a lapse opens the in-app placement, which is the dismissible one', async () => {
  const { present } = await mount({ paywall: 'builder', setupComplete: true });
  expect(present).toHaveBeenCalledWith('in_app', 'annual');
});

test('opening the paywall happens once a screen, not once a render', async () => {
  const { present } = await mount({ paywall: 'builder' });
  await act(async () => undefined);
  expect(present).toHaveBeenCalledTimes(1);
});

test('a dismissal that bought nothing leaves the user somewhere they can try again', async () => {
  const { runtime, present } = await mount({ paywall: 'builder', outcome: 'cancel' });
  const retry = await screen.findByRole('button', { name: 'Start free trial' });
  expect(present).toHaveBeenCalledTimes(1);
  runtime.dev.setOutcome('success');
  await act(async () => fireEvent.press(retry));
  await waitFor(() => expect(present).toHaveBeenCalledTimes(2));
});

test('a paywall that could not be fetched says so instead of showing an empty screen', async () => {
  await mount({ paywall: 'builder', outcome: 'error' });
  expect(await screen.findByText('Something went wrong. Please try again.')).toBeTruthy();
});
