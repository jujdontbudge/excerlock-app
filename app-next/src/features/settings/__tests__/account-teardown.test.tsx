import { render, screen, userEvent } from '@testing-library/react-native';
import { AccountScreen } from '../AccountScreen';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';

async function signedInScreen() {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  await runtime.auth.signInWithApple();
  const calls: string[] = [];
  runtime.subscription.reset = () => calls.push('subscription');
  runtime.analytics.reset = () => calls.push('analytics');
  const deleteAccount = runtime.auth.deleteAccount,
    signOut = runtime.auth.signOut;
  runtime.auth.deleteAccount = async () => {
    calls.push('auth');
    await deleteAccount();
  };
  runtime.auth.signOut = async () => {
    calls.push('auth');
    await signOut();
  };
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <AccountScreen onSignIn={() => {}} onBack={() => {}} />
    </AppRuntimeProvider>,
  );
  return { runtime, calls };
}

test('deleting the account tears down subscription, then analytics, then auth', async () => {
  const { runtime, calls } = await signedInScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Delete account' }));
  await userEvent.press(screen.getByRole('button', { name: 'Delete account forever' }));
  expect(calls).toEqual(['subscription', 'analytics', 'auth']);
  expect(runtime.auth.session()).toMatchObject({ kind: 'anonymous' });
  runtime.dispose();
});

test('signing out follows the same teardown order', async () => {
  const { runtime, calls } = await signedInScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Sign out' }));
  await userEvent.press(screen.getAllByRole('button', { name: 'Sign out' }).at(-1)!);
  expect(calls).toEqual(['subscription', 'analytics', 'auth']);
  runtime.dispose();
});
