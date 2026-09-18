import { render, screen, userEvent, fireEvent, act } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { FeedbackScreen } from '../FeedbackScreen';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { supportDelivery } from '../../../runtime/SupportDelivery';
import { supportDeviceFooter, supportEmail } from '../../../content/support';
import { SupportPort } from '../../../ports/SupportPort';

async function renderFeedback(runtime = createRuntime()) {
  await runtime.dev.load('fresh-install');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <FeedbackScreen />
    </AppRuntimeProvider>,
  );
  return runtime;
}

test('feedback submits through the fake port and shows success', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <FeedbackScreen />
    </AppRuntimeProvider>,
  );
  expect(screen.getByRole('button', { name: 'Submit feedback' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('Reply email'), 'alex@example.com');
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
  await renderFeedback(runtime);
  await fireEvent.changeText(screen.getByLabelText('Reply email'), 'alex@example.com');
  await fireEvent.changeText(screen.getByLabelText('Your feedback'), 'Please look at this');
  await userEvent.press(screen.getByRole('button', { name: 'Submit feedback' }));
  expect(await screen.findByRole('header', { name: 'Finish sending in Mail' })).toBeTruthy();
});

test('failed send shows the support address and keeps the typed text', async () => {
  const runtime = createRuntime();
  runtime.support.send = jest.fn().mockRejectedValue(new Error('offline'));
  await renderFeedback(runtime);
  await fireEvent.changeText(screen.getByLabelText('Reply email'), 'alex@example.com');
  await fireEvent.changeText(screen.getByLabelText('Your feedback'), 'Cannot send');
  await userEvent.press(screen.getByRole('button', { name: 'Submit feedback' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(new RegExp(supportEmail));
  expect(screen.getByLabelText('Your feedback')).toHaveProp('value', 'Cannot send');
  expect(screen.getByRole('button', { name: 'Submit feedback' })).toBeEnabled();
});

test('Email support instead opens a mailto to support', async () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await renderFeedback();
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
