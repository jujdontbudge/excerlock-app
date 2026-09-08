import { waitFor } from '@testing-library/react-native';
import { createRuntime } from '../../../runtime/createRuntime';
import { entitlementStore } from '../../../state/entitlementStore';
import { startNotificationScheduling } from '../startNotifications';

async function start(scenario: string) {
  const runtime = createRuntime();
  await runtime.dev.load(scenario);
  const trial = jest.spyOn(runtime.notifications, 'scheduleTrialReminder');
  const lease = jest.spyOn(runtime.notifications, 'scheduleWalkLeaseWarning');
  const cancel = jest.spyOn(runtime.notifications, 'cancel');
  const stop = startNotificationScheduling(runtime);
  return {
    runtime,
    trial,
    lease,
    cancel,
    stop: () => {
      stop();
      runtime.dispose();
    },
  };
}

test('a trial with a known end schedules the reminder from the live offer', async () => {
  const { trial, cancel, stop } = await start('trial-active');
  await waitFor(() => expect(trial).toHaveBeenCalledTimes(1));
  expect(trial).toHaveBeenCalledWith('2026-09-12T22:00:00.000Z', 2);
  expect(cancel).not.toHaveBeenCalled();
  stop();
});

test('conversion cancels the pending reminder, and a lapse does too', async () => {
  const { runtime, trial, cancel, stop } = await start('trial-active');
  await waitFor(() => expect(trial).toHaveBeenCalledTimes(1));
  const id = await trial.mock.results[0].value;
  runtime.dev.setEntitlement('active');
  await waitFor(() => expect(cancel).toHaveBeenCalledWith(id));
  expect(trial).toHaveBeenCalledTimes(1);
  stop();
});

test('an active subscriber never gets a trial reminder', async () => {
  const { trial, stop } = await start('home-locked-walking');
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(trial).not.toHaveBeenCalled();
  stop();
});

test('the reminder waits for the permission and follows it', async () => {
  const { runtime, trial, cancel, stop } = await start('trial-active');
  await waitFor(() => expect(trial).toHaveBeenCalledTimes(1));
  runtime.dev.setPermission('notifications', 'denied');
  await waitFor(() => expect(cancel).toHaveBeenCalledTimes(1));
  runtime.dev.setPermission('notifications', 'granted');
  await waitFor(() => expect(trial).toHaveBeenCalledTimes(2));
  stop();
});

test('a changed renewal date moves the reminder', async () => {
  const { trial, cancel, stop } = await start('trial-active');
  await waitFor(() => expect(trial).toHaveBeenCalledTimes(1));
  entitlementStore.getState().patch({ entitlement: { status: 'trial', renewsAt: '2026-09-15T15:00:00.000Z' } });
  await waitFor(() => expect(trial).toHaveBeenCalledTimes(2));
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(trial).toHaveBeenLastCalledWith('2026-09-13T22:00:00.000Z', 2);
  stop();
});

test('a live walking session schedules its warning 30 seconds before the lease lapses', async () => {
  const { lease, stop } = await start('home-walking-session');
  await waitFor(() => expect(lease).toHaveBeenCalledTimes(1));
  expect(lease).toHaveBeenCalledWith('2026-09-07T15:14:30.000Z', 'handheld');
  stop();
});

test('a renewal reschedules the warning and a stop cancels it', async () => {
  const { runtime, lease, cancel, stop } = await start('home-walking-session');
  await waitFor(() => expect(lease).toHaveBeenCalledTimes(1));
  const first = await lease.mock.results[0].value;
  // Six seconds in, the scripted walk is still live; a re-scan renews the lease from now.
  runtime.dev.advance(6_000);
  expect(runtime.walking.completeProppedScan()).toBe(true);
  await waitFor(() => expect(lease).toHaveBeenCalledTimes(2));
  expect(cancel).toHaveBeenCalledWith(first);
  expect(lease).toHaveBeenLastCalledWith('2026-09-07T15:14:36.000Z', 'handheld');
  const second = await lease.mock.results[1].value;
  runtime.walking.stop();
  await waitFor(() => expect(cancel).toHaveBeenCalledWith(second));
  expect(lease).toHaveBeenCalledTimes(2);
  stop();
});

test('a session started without the permission schedules nothing and never asks', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-walking-session');
  runtime.dev.setPermission('notifications', 'notDetermined');
  const lease = jest.spyOn(runtime.notifications, 'scheduleWalkLeaseWarning');
  const request = jest.spyOn(runtime.notifications, 'request');
  const stop = startNotificationScheduling(runtime);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(lease).not.toHaveBeenCalled();
  expect(request).not.toHaveBeenCalled();
  stop();
  runtime.dispose();
});
