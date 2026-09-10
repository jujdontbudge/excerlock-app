import { render, screen, userEvent, fireEvent, act } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { BugReportScreen } from '../BugReportScreen';
import { FeedbackScreen } from '../FeedbackScreen';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { supportDelivery } from '../../../runtime/SupportDelivery';
import { supportDeviceFooter, supportEmail } from '../../../content/support';
import { SupportPort } from '../../../ports/SupportPort';

async function renderBug(runtime = createRuntime()) {
  await runtime.dev.load('fresh-install');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <BugReportScreen />
    </AppRuntimeProvider>,
  );
  return runtime;
}

test('bug report blocks empty submissions, shows busy and then success through its fake port', async () => {
  await renderBug();
  expect(screen.getByRole('button', { name: 'Send report' })).toBeDisabled();
  expect(screen.getByText(/iOS/)).toBeTruthy();
  expect(screen.getByText(/ExcerLock 1.0.0/)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Describe the issue'), 'The lock never lifts');
  await userEvent.press(screen.getByRole('button', { name: 'Send report' }));
  expect(screen.getByRole('button', { name: 'Sending…' })).toBeTruthy();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 650));
  });
  expect(screen.getByRole('header', { name: 'Report sent' })).toBeTruthy();
});

test('feedback submits through the fake port and shows success', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <FeedbackScreen />
    </AppRuntimeProvider>,
  );
  expect(screen.getByRole('button', { name: 'Submit feedback' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('Your feedback'), 'A useful idea');
  await userEvent.press(screen.getByRole('button', { name: 'Submit feedback' }));
  expect(screen.getByRole('button', { name: 'Sending…' })).toBeTruthy();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 650));
  });
  expect(screen.getByRole('header', { name: 'Feedback sent' })).toBeTruthy();
});

test('mail delivery shows the handoff title', async () => {
  const runtime = createRuntime();
  runtime.support.send = jest.fn().mockResolvedValue({ via: 'mail' });
  await renderBug(runtime);
  await fireEvent.changeText(screen.getByLabelText('Describe the issue'), 'Please look at this');
  await userEvent.press(screen.getByRole('button', { name: 'Send report' }));
  expect(await screen.findByRole('header', { name: 'Finish sending in Mail' })).toBeTruthy();
});

test('failed send shows the support address and keeps the typed text', async () => {
  const runtime = createRuntime();
  runtime.support.send = jest.fn().mockRejectedValue(new Error('offline'));
  await renderBug(runtime);
  await fireEvent.changeText(screen.getByLabelText('Describe the issue'), 'Cannot send');
  await userEvent.press(screen.getByRole('button', { name: 'Send report' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(new RegExp(supportEmail));
  expect(screen.getByLabelText('Describe the issue')).toHaveProp('value', 'Cannot send');
  expect(screen.getByRole('button', { name: 'Send report' })).toBeEnabled();
});

test('Email support instead opens a mailto to support', async () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await renderBug();
  await userEvent.press(screen.getByRole('button', { name: 'Email support instead' }));
  const url = String(openURL.mock.calls[0][0]);
  expect(url.startsWith(`mailto:${supportEmail}?`)).toBe(true);
  expect(new URLSearchParams(url.slice(url.indexOf('?') + 1)).get('subject')).toBe('[ExcerLock] Support');
  openURL.mockRestore();
});

test('SupportDelivery opens a Problem mailto with a device footer and rejects when Mail fails', async () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const inner: SupportPort = { send: jest.fn(async () => ({ via: 'server' as const })) };
  await supportDelivery(inner).send('Problem', 'The lock never lifts');
  expect(inner.send).toHaveBeenCalledWith('Problem', 'The lock never lifts');
  const url = String(openURL.mock.calls[0][0]);
  expect(url.startsWith(`mailto:${supportEmail}?`)).toBe(true);
  const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
  expect(params.get('subject')).toBe('[ExcerLock] Problem');
  expect(
    params
      .get('body')
      ?.endsWith(
        supportDeviceFooter(
          Constants.expoConfig?.version ?? '1.0.0',
          Constants.expoConfig?.ios?.buildNumber ?? '1',
          Platform.Version,
        ),
      ),
  ).toBe(true);
  openURL.mockRejectedValueOnce(new Error('no mail'));
  await expect(supportDelivery(inner).send('Problem', 'Still broken')).rejects.toThrow('no mail');
  openURL.mockRestore();
});
