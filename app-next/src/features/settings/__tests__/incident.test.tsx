import { render, screen, userEvent, fireEvent, act } from '@testing-library/react-native';
import { ReportProblemScreen } from '../ReportProblemScreen';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { incidentCopy as i } from '../../../content/incident';

async function renderReport(runtime = createRuntime()) {
  await runtime.dev.load('fresh-install');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <ReportProblemScreen />
    </AppRuntimeProvider>,
  );
  return runtime;
}

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 650));
  });

test('Send is pressable from the start and says what is missing instead of doing nothing', async () => {
  const runtime = await renderReport();
  const send = jest.spyOn(runtime.incidentReports, 'send'),
    track = jest.spyOn(runtime.analytics, 'track');
  expect(screen.getByRole('header', { name: i.title })).toBeTruthy();
  expect(screen.queryByLabelText('Reply email')).toBeNull();
  // Both empty: a tap must answer on screen, never be swallowed by a disabled button.
  expect(screen.getByRole('button', { name: i.send })).toBeEnabled();
  await userEvent.press(screen.getByRole('button', { name: i.send }));
  expect(screen.getByRole('alert')).toHaveTextContent(i.missingBoth);
  expect(send).not.toHaveBeenCalled();
  // One answer: the message names the other one.
  await fireEvent.changeText(screen.getByLabelText(i.wrongField), 'My apps stayed locked after my walk.');
  expect(screen.getByRole('button', { name: i.send })).toBeEnabled();
  await userEvent.press(screen.getByRole('button', { name: i.send }));
  expect(screen.getByRole('alert')).toHaveTextContent(i.missingExpected);
  expect(send).not.toHaveBeenCalled();
  // Typing clears the nag; sending shows busy, then the thanks screen.
  await fireEvent.changeText(screen.getByLabelText(i.expectedField), 'They should have opened at 3,000 steps.');
  expect(screen.queryByRole('alert')).toBeNull();
  await userEvent.press(screen.getByRole('button', { name: i.send }));
  expect(screen.getByRole('button', { name: i.sending })).toBeDisabled();
  await settle();
  expect(screen.getByRole('header', { name: i.sentTitle })).toBeTruthy();
  expect(send).toHaveBeenCalledWith({
    whatWentWrong: 'My apps stayed locked after my walk.',
    shouldHaveHappened: 'They should have opened at 3,000 steps.',
  });
  expect(track).toHaveBeenCalledWith('incident_report_sent', expect.objectContaining({ source: 'settings', activity: 'none' }));
});

test('Send with only the second answer names the first one', async () => {
  await renderReport();
  await fireEvent.changeText(screen.getByLabelText(i.expectedField), 'They should have opened.');
  await userEvent.press(screen.getByRole('button', { name: i.send }));
  expect(screen.getByRole('alert')).toHaveTextContent(i.missingWrong);
});

test('a failed send is shown on screen with its reason and the words stay for a retry', async () => {
  const runtime = createRuntime();
  await renderReport(runtime);
  const send = jest.spyOn(runtime.incidentReports, 'send').mockRejectedValueOnce(new Error('Incident report rejected (503)'));
  await fireEvent.changeText(screen.getByLabelText(i.wrongField), 'Locked after my walk.');
  await fireEvent.changeText(screen.getByLabelText(i.expectedField), 'Should have opened.');
  await userEvent.press(screen.getByRole('button', { name: i.send }));
  await settle();
  expect(screen.getByRole('alert')).toHaveTextContent(i.error);
  expect(screen.getByText('Incident report rejected (503)')).toBeTruthy();
  expect(screen.getByLabelText(i.wrongField).props.value).toBe('Locked after my walk.');
  expect(screen.getByRole('button', { name: i.send })).toBeEnabled();
  // Retry goes through and reaches the thanks screen.
  send.mockRestore();
  await userEvent.press(screen.getByRole('button', { name: i.send }));
  await settle();
  expect(screen.getByRole('header', { name: i.sentTitle })).toBeTruthy();
});

test('tells the person what travels with the report, and never asks for an email', async () => {
  await renderReport();
  expect(screen.getByText(i.attached)).toBeTruthy();
  expect(screen.getByText(i.attachedBody)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /mail/i })).toBeNull();
});
