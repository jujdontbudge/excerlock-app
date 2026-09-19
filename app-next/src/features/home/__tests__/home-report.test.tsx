import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { HomeReport } from '../HomeReport';
import { HomeScreen } from '../HomeScreen';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { activityTruthStore } from '../../../state/activityTruthStore';
import { incidentCopy as i } from '../../../content/incident';

jest.mock('../../../motion/haptics', () => ({ feedback: jest.fn() }));
const h = i.home;

async function renderReport(lockState = 'locked') {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <HomeReport lockState={lockState} />
    </AppRuntimeProvider>,
  );
  return runtime;
}

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 650));
  });

beforeEach(() => activityTruthStore.getState().clear());

test('holding a chip marks it as the one active label, records it and tells analytics', async () => {
  const runtime = await renderReport();
  const track = jest.spyOn(runtime.analytics, 'track');
  for (const label of [h.walking, h.sitting, h.shaking, h.treadmill])
    expect(screen.getByRole('button', { name: label })).not.toBeSelected();
  // A plain tap does not set the label; it answers with the hold hint instead of silence.
  await userEvent.press(screen.getByRole('button', { name: h.walking }));
  expect(activityTruthStore.getState().data).toBeNull();
  expect(screen.getByText(h.nudge)).toBeTruthy();
  await fireEvent(screen.getByRole('button', { name: h.walking }), 'longPress');
  expect(activityTruthStore.getState().data?.activity).toBe('walking');
  expect(screen.getByRole('button', { name: h.walking })).toBeSelected();
  expect(track).toHaveBeenCalledWith('activity_truth_held', { activity: 'walking', lock_state: 'locked' });
  // Holding another replaces it: one active label.
  await fireEvent(screen.getByRole('button', { name: h.shaking }), 'longPress');
  expect(activityTruthStore.getState().data?.activity).toBe('shaking');
  expect(screen.getByRole('button', { name: h.walking })).not.toBeSelected();
  expect(screen.getByRole('button', { name: h.shaking })).toBeSelected();
});

test('Report then Send is two taps: the words carry the reason and the held label, then thanks', async () => {
  const runtime = await renderReport('locked');
  const send = jest.spyOn(runtime.incidentReports, 'send'),
    track = jest.spyOn(runtime.analytics, 'track');
  await fireEvent(screen.getByRole('button', { name: h.walking }), 'longPress');
  await userEvent.press(screen.getByRole('button', { name: h.reportLabel }));
  // Locked → "Still locked" is preselected; the summary says exactly what goes out.
  expect(screen.getByRole('radio', { name: h.stillLocked })).toBeChecked();
  expect(screen.getByText(h.summary(h.stillLocked, h.walking))).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: i.send }));
  expect(screen.getByRole('button', { name: i.sending })).toBeDisabled();
  await settle();
  expect(send).toHaveBeenCalledWith({ whatWentWrong: 'Still locked while walking', shouldHaveHappened: h.expected.stillLocked });
  expect(track).toHaveBeenCalledWith('incident_report_sent', { source: 'home', activity: 'walking', lock_state: 'locked' });
  expect(screen.getByRole('header', { name: i.sentTitle })).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: h.done }));
  expect(screen.queryByRole('header', { name: i.sentTitle })).toBeNull();
});

test('unlocked preselects "Unlocked by mistake"; no held label sends words without one', async () => {
  const runtime = await renderReport('unlockedMet');
  const send = jest.spyOn(runtime.incidentReports, 'send'),
    track = jest.spyOn(runtime.analytics, 'track');
  await userEvent.press(screen.getByRole('button', { name: h.reportLabel }));
  expect(screen.getByRole('radio', { name: h.wronglyOpen })).toBeChecked();
  expect(screen.getByText(h.summary(h.wronglyOpen, null))).toBeTruthy();
  await userEvent.press(screen.getByRole('radio', { name: h.other }));
  await userEvent.press(screen.getByRole('button', { name: i.send }));
  await settle();
  expect(send).toHaveBeenCalledWith({ whatWentWrong: 'Something else', shouldHaveHappened: h.expected.other });
  expect(track).toHaveBeenCalledWith('incident_report_sent', { source: 'home', activity: 'none', lock_state: 'unlockedMet' });
});

test('a failed send shows its reason in the sheet and Send stays for a retry', async () => {
  const runtime = await renderReport();
  const send = jest.spyOn(runtime.incidentReports, 'send').mockRejectedValueOnce(new Error('Incident report rejected (503)'));
  await userEvent.press(screen.getByRole('button', { name: h.reportLabel }));
  await userEvent.press(screen.getByRole('button', { name: i.send }));
  await settle();
  expect(screen.getByRole('alert')).toHaveTextContent(i.error);
  expect(screen.getByText('Incident report rejected (503)')).toBeTruthy();
  send.mockRestore();
  await userEvent.press(screen.getByRole('button', { name: i.send }));
  await settle();
  expect(screen.getByRole('header', { name: i.sentTitle })).toBeTruthy();
});

test('Home shows the chips and Report without opening anything', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  await renderRouter({
    _layout: () => <AppRuntimeProvider runtime={runtime}><HomeScreen /></AppRuntimeProvider>,
    index: () => null,
  });
  expect(screen.getByRole('button', { name: h.reportLabel })).toBeTruthy();
  expect(screen.getByRole('button', { name: h.walking })).toBeTruthy();
  expect(screen.getByRole('button', { name: h.treadmill })).toBeTruthy();
  runtime.dispose();
});
