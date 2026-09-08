import { render, screen, userEvent, act } from '@testing-library/react-native';
import { TrialScreen } from '../TrialScreen';
import { FakePromptHost } from '../../permissions/FakePromptHost';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { permissionsStore } from '../../../state/permissionsStore';
import { subscriptionCopy } from '../../../content/subscription';

test.each([
  [{ trialDays: 7, reminderDaysBefore: 2, label: 'offer' }, '2 days before your trial ends', 'Day 5 · Reminder', 'Day 7 · Billing begins'],
  [{ trialDays: 3, reminderDaysBefore: 2, label: 'offer' }, '2 days before your trial ends', 'Day 1 · Reminder', 'Day 3 · Billing begins'],
  [{ trialDays: 2, reminderDaysBefore: 2, label: 'offer' }, '1 day before your trial ends', 'Day 1 · Reminder', 'Day 2 · Billing begins'],
] as const)('trial copy is derived from the live offer %#', (offer, reminder, reminderDay, billingDay) => {
  expect(subscriptionCopy.reminder(offer)).toBe(reminder);
  expect(subscriptionCopy.timeline(offer).map((item) => item.title)).toEqual(['Today', reminderDay, billingDay]);
});
test.each(['grant', 'deny', 'ask'] as const)(
  'reminder request in %s mode continues with stored result',
  async (mode) => {
    const runtime = createRuntime();
    await runtime.dev.load('fresh-install');
    runtime.dev.setPromptMode(mode);
    const onContinue = jest.fn();
    await render(
      <AppRuntimeProvider runtime={runtime}>
        <TrialScreen step="T3" onContinue={onContinue} />
        <FakePromptHost />
      </AppRuntimeProvider>,
    );
    await userEvent.press(screen.getByRole('button', { name: 'Enable reminders' }));
    if (mode === 'ask') await userEvent.press(screen.getByRole('button', { name: 'Allow' }));
    await act(async () => {});
    expect(permissionsStore.getState().data.notifications).toBe(mode === 'deny' ? 'denied' : 'granted');
    expect(onContinue).toHaveBeenCalledTimes(1);
  },
);
test('skipping a reminder does not request a permission', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const onContinue = jest.fn();
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <TrialScreen step="T3" onContinue={onContinue} />
    </AppRuntimeProvider>,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Maybe later' }));
  expect(onContinue).toHaveBeenCalled();
  expect(runtime.dev.snapshot().prompt).toBeNull();
});
