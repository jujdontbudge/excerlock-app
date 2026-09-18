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

test('Send waits for both answers, shows busy, then thanks the person', async () => {
  const runtime = await renderReport();
  const send = jest.spyOn(runtime.incidentReports, 'send');
  expect(screen.getByRole('header', { name: i.title })).toBeTruthy();
  expect(screen.getByRole('button', { name: i.send })).toBeDisabled();
  expect(screen.queryByLabelText('Reply email')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText(i.wrongField), 'My apps stayed locked after my walk.');
  expect(screen.getByRole('button', { name: i.send })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText(i.expectedField), 'They should have opened at 3,000 steps.');
  expect(screen.getByRole('button', { name: i.send })).toBeEnabled();
  await userEvent.press(screen.getByRole('button', { name: i.send }));
  expect(screen.getByRole('button', { name: i.sending })).toBeTruthy();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 650));
  });
  expect(screen.getByRole('header', { name: i.sentTitle })).toBeTruthy();
  expect(send).toHaveBeenCalledWith({
    whatWentWrong: 'My apps stayed locked after my walk.',
    shouldHaveHappened: 'They should have opened at 3,000 steps.',
  });
});

test('tells the person what travels with the report, and never asks for an email', async () => {
  await renderReport();
  expect(screen.getByText(i.attached)).toBeTruthy();
  expect(screen.getByText(i.attachedBody)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /mail/i })).toBeNull();
});
