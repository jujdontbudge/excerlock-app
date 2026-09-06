import { render, screen, userEvent, fireEvent, act } from '@testing-library/react-native';
import { SettingsScreen } from '../SettingsScreen';
import { SupportScreen } from '../SupportScreen';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { settingsStore } from '../../../state/settingsStore';
test('required rows, persistent preferences and seven-tap developer entry', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  const dev = jest.fn(),
    navigate = jest.fn();
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <SettingsScreen navigate={navigate} onDev={dev} />
    </AppRuntimeProvider>,
  );
  for (const name of [
    'Manage subscription',
    'Restore purchases',
    'Saved gyms',
    'Contact support',
    'Privacy Policy',
    'Terms of Use',
    'Account',
  ])
    expect(screen.getByRole('button', { name })).toBeTruthy();
  expect(screen.getAllByRole('button', { name: /, Granted$/ })).toHaveLength(6);
  await userEvent.press(screen.getByRole('tab', { name: 'km' }));
  expect(settingsStore.getState().data.units).toBe('km');
  await userEvent.press(screen.getByRole('button', { name: /Walk & Scroll stop grace/ }));
  await userEvent.press(screen.getByRole('radio', { name: '2 minutes' }));
  expect(settingsStore.getState().data.stopGrace).toBe(120);
  const footer = screen.getByRole('button', { name: /ExcerLock 1.0.0/ });
  for (let i = 0; i < 7; i++) await userEvent.press(footer);
  expect(dev).toHaveBeenCalledTimes(1);
});
test('support blocks empty submissions, shows busy and then success through its fake port', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <SupportScreen />
    </AppRuntimeProvider>,
  );
  expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('Your message'), 'A useful idea');
  await userEvent.press(screen.getByRole('button', { name: 'Send message' }));
  expect(screen.getByRole('button', { name: 'Sending…' })).toBeTruthy();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 650));
  });
  expect(screen.getByRole('header', { name: 'Message sent' })).toBeTruthy();
});

test('restore exposes pending feedback on its own row', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  let finish!: (value: Awaited<ReturnType<typeof runtime.subscription.restore>>) => void;
  runtime.subscription.restore = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <SettingsScreen navigate={() => {}} onDev={() => {}} />
    </AppRuntimeProvider>,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Restore purchases' }));
  expect(screen.getByRole('button', { name: 'Restore purchases, Restoring purchases…' })).toBeTruthy();
  await act(async () => {
    finish({ status: 'active', renewsAt: null });
  });
});
