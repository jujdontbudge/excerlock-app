import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';
import { SignInScreen } from '../SignInScreen';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { sessionStore } from '../../../state/sessionStore';
import { setupCopy } from '../../../content/setup';
test('email validates, shows wrong code, resends, and signs in with 123456', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const onContinue = jest.fn();
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <SignInScreen onContinue={onContinue} />
    </AppRuntimeProvider>,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Continue with email' }));
  await fireEvent.changeText(screen.getByLabelText('Email address'), 'alex@example.test');
  await userEvent.press(screen.getByRole('button', { name: 'Send code' }));
  await fireEvent.changeText(screen.getByLabelText('Verification code'), '000000');
  await userEvent.press(screen.getByRole('button', { name: 'Verify code' }));
  expect(screen.getByText('That code did not work. Please try again.')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Resend code' }));
  expect(screen.getByText('A new code is ready.')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Verification code'), '123456');
  await userEvent.press(screen.getByRole('button', { name: 'Verify code' }));
  expect(sessionStore.getState().data.session.kind).toBe('signedIn');
  expect(onContinue).toHaveBeenCalledTimes(1);
});
test.each(['apple', 'google'] as const)(
  '%s cancellation does not advance or claim a saved account',
  async (provider) => {
    const runtime = createRuntime();
    await runtime.dev.load('fresh-install');
    runtime.dev.setOutcome('cancel');
    const onContinue = jest.fn();
    await render(
      <AppRuntimeProvider runtime={runtime}>
        <SignInScreen onContinue={onContinue} />
      </AppRuntimeProvider>,
    );
    await userEvent.press(
      screen.getByRole('button', { name: provider === 'apple' ? 'Continue with Apple' : 'Continue with Google' }),
    );
    expect(onContinue).not.toHaveBeenCalled();
    expect(screen.getByText('Sign-in was canceled. You can try again or skip for now.')).toBeTruthy();
  },
);
test('the sign-in screen says what signing in restores and what stays on the device', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <SignInScreen onContinue={jest.fn()} />
    </AppRuntimeProvider>,
  );
  const promise = screen.getByText(setupCopy.restoreNote);
  expect(promise).toBeTruthy();
  expect(setupCopy.restoreNote).toMatch(/new phone/);
  expect(setupCopy.restoreNote).toMatch(/stays on this device/);
});
