import { render, screen, userEvent } from '@testing-library/react-native';
import { WelcomeFooter } from '../welcome/WelcomeFooter';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { entitlementStore } from '../../../state/entitlementStore';

async function renderWelcome() {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <WelcomeFooter onContinue={() => {}} />
    </AppRuntimeProvider>,
  );
  return runtime;
}

test('signing in from welcome restores an active subscription', async () => {
  const runtime = await renderWelcome();
  runtime.dev.setRestoreOutcome('restored');
  await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue with Apple' }));
  expect(entitlementStore.getState().data.entitlement.status).toBe('active');
  expect(screen.queryByText('That account has no active subscription. Choose a plan to continue.')).toBeNull();
  runtime.dispose();
});

test('signing in from welcome with no purchase keeps onboarding and explains why', async () => {
  const runtime = await renderWelcome();
  runtime.dev.setRestoreOutcome('notFound');
  await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue with Apple' }));
  expect(screen.getByText('That account has no active subscription. Choose a plan to continue.')).toBeTruthy();
  expect(entitlementStore.getState().data.entitlement.status).toBe('none');
  runtime.dispose();
});

test('a failed welcome restore shows a retry note and keeps the signed-in session', async () => {
  const runtime = await renderWelcome();
  runtime.subscription.restore = async () => {
    throw new Error('restore failed');
  };
  await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue with Apple' }));
  expect(screen.getByText("We couldn't check that account. Try again.")).toBeTruthy();
  expect(runtime.auth.session().kind).toBe('signedIn');
  runtime.dispose();
});
