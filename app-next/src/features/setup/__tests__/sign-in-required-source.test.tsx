import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { SignInScreen } from '../SignInScreen';
import { useSignInRequiredSource } from '../useSignInRequiredSource';

/** The exact wiring every mount uses: the gate source is supplied to the screen. */
function Mount({ onContinue }: { onContinue: () => void }) {
  const signInRequired = useSignInRequiredSource();
  return <SignInScreen onContinue={onContinue} signInRequired={signInRequired} />;
}

async function mount(gate?: { isRequired(): Promise<boolean> }) {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  runtime.signInRequired = gate;
  const onContinue = jest.fn();
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <Mount onContinue={onContinue} />
    </AppRuntimeProvider>,
  );
  return { runtime, onContinue };
}

test('signInRequired=true makes X4 blocking', async () => {
  const gate = { isRequired: jest.fn(async () => true) };
  await mount(gate);
  await waitFor(() => expect(gate.isRequired).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: 'Skip for now' })).toBeNull();
});

test('signInRequired=false keeps X4 skippable through the runtime gate', async () => {
  const gate = { isRequired: jest.fn(async () => false) };
  const { onContinue } = await mount(gate);
  await userEvent.press(await screen.findByRole('button', { name: 'Skip for now' }));
  expect(onContinue).toHaveBeenCalledTimes(1);
});

test('a runtime with no gate port keeps the false default and stays skippable', async () => {
  const { onContinue } = await mount(undefined);
  await userEvent.press(await screen.findByRole('button', { name: 'Skip for now' }));
  expect(onContinue).toHaveBeenCalledTimes(1);
});

test('a failed gate read stays fail-closed until the retry answers', async () => {
  const isRequired = jest
    .fn<Promise<boolean>, []>()
    .mockRejectedValueOnce(new Error('flags offline'))
    .mockResolvedValueOnce(false);
  await mount({ isRequired });
  expect(await screen.findByRole('alert')).toHaveTextContent(/requirements could not load/i);
  expect(screen.queryByRole('button', { name: 'Skip for now' })).toBeNull();
  await userEvent.press(screen.getByRole('button', { name: 'Retry sign-in requirements' }));
  expect(await screen.findByRole('button', { name: 'Skip for now' })).toBeTruthy();
  expect(isRequired).toHaveBeenCalledTimes(2);
});
