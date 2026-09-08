import { describeNotificationsPort } from '../../../ports/__tests__/notificationsContract';
import { permissionsStore } from '../../../state/permissionsStore';
import { notificationCopy } from '../../../content/notifications';
import { TRIAL_REMINDER_ID, WALK_LEASE_WARNING_ID } from '../catalog';
import { expoNotificationsAdapter } from '../ExpoNotificationsAdapter';
import { toPermissionStatus } from '../permissionStatus';
import { fakeExpoNotifications, iosPermissions } from './fakeExpoNotifications';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => permissionsStore.getState().reset());

describeNotificationsPort(async () => ({ port: expoNotificationsAdapter(fakeExpoNotifications().module) }));

test.each([
  [0, 'notDetermined'],
  [1, 'denied'],
  [2, 'granted'],
  [3, 'granted'],
  [4, 'granted'],
] as const)('iOS authorization status %i reads as %s', (status, expected) => {
  expect(toPermissionStatus(iosPermissions(status))).toBe(expected);
});

test('without an iOS block the cross-platform status decides, and nothing is ever restricted', () => {
  const cross = (status: string) => ({ status, granted: status === 'granted', canAskAgain: true, expires: 'never' }) as never;
  expect(toPermissionStatus(cross('granted'))).toBe('granted');
  expect(toPermissionStatus(cross('denied'))).toBe('denied');
  expect(toPermissionStatus(cross('undetermined'))).toBe('notDetermined');
});

test('status answers from the last known value and records the OS answer as Reminders for Settings', async () => {
  permissionsStore.getState().patch({ notifications: 'granted' });
  const expo = fakeExpoNotifications(iosPermissions(1));
  const port = expoNotificationsAdapter(expo.module);
  expect(port.status()).toBe('granted');
  await flush();
  expect(port.status()).toBe('denied');
  expect(permissionsStore.getState().data.notifications).toBe('denied');
});

test('request asks for alerts and sound only, never a badge, and records the answer', async () => {
  const expo = fakeExpoNotifications(iosPermissions(0));
  const request = jest.spyOn(expo.module, 'requestPermissionsAsync');
  const port = expoNotificationsAdapter(expo.module);
  expo.answerRequestWith(iosPermissions(2));
  await expect(port.request()).resolves.toBe('granted');
  expect(request).toHaveBeenCalledWith({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  expect(permissionsStore.getState().data.notifications).toBe('granted');
});

test('the two kinds use fixed identifiers, so scheduling again replaces rather than duplicates', async () => {
  const expo = fakeExpoNotifications(iosPermissions(2));
  const port = expoNotificationsAdapter(expo.module);
  await port.scheduleTrialReminder('2026-09-12T22:00:00.000Z', 2);
  await port.scheduleTrialReminder('2026-09-13T22:00:00.000Z', 1);
  await port.scheduleWalkLeaseWarning('2026-09-07T15:14:30.000Z', 'propped');
  expect([...expo.pending.keys()].sort()).toEqual([TRIAL_REMINDER_ID, WALK_LEASE_WARNING_ID].sort());
  const trial = expo.pending.get(TRIAL_REMINDER_ID)!;
  expect(trial.content.title).toBe(notificationCopy.trial.title(1));
  expect(trial.content.data).toEqual({ route: '/(tabs)/settings' });
  expect(trial.trigger).toEqual({ type: 'date', date: new Date('2026-09-13T22:00:00.000Z') });
  const lease = expo.pending.get(WALK_LEASE_WARNING_ID)!;
  expect(lease.content.title).toBe(notificationCopy.lease.propped.title);
  expect(lease.content.data).toEqual({ route: '/(tabs)/home' });
  await port.cancel(TRIAL_REMINDER_ID);
  expect([...expo.pending.keys()]).toEqual([WALK_LEASE_WARNING_ID]);
});

test('the foreground handler banners the lease warning, mutes the trial reminder behind the paywall, and stays silent for the shield id', async () => {
  let paywallOpen = false;
  const expo = fakeExpoNotifications(iosPermissions(2));
  expoNotificationsAdapter(expo.module, { paywallOpen: () => paywallOpen });
  expect(await expo.present(WALK_LEASE_WARNING_ID)).toMatchObject({ shouldShowBanner: true, shouldPlaySound: true });
  expect(await expo.present(TRIAL_REMINDER_ID)).toMatchObject({ shouldShowBanner: true, shouldShowList: true });
  paywallOpen = true;
  expect(await expo.present(TRIAL_REMINDER_ID)).toMatchObject({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false });
  expect(await expo.present(WALK_LEASE_WARNING_ID)).toMatchObject({ shouldShowBanner: true });
  expect(await expo.present('excerlock.shield.open.locked')).toMatchObject({ shouldShowBanner: false, shouldSetBadge: false });
});

test('responses surface only the identifier and can be cleared', () => {
  const expo = fakeExpoNotifications(iosPermissions(2));
  const port = expoNotificationsAdapter(expo.module);
  expect(port.responses.last()).toBeNull();
  expo.launchWith(TRIAL_REMINDER_ID);
  expect(port.responses.last()).toEqual({ identifier: TRIAL_REMINDER_ID });
  port.responses.clear();
  expect(port.responses.last()).toBeNull();
  const seen: string[] = [];
  const stop = port.responses.subscribe(({ identifier }) => seen.push(identifier));
  expo.tap(WALK_LEASE_WARNING_ID);
  stop();
  expo.tap(WALK_LEASE_WARNING_ID);
  expect(seen).toEqual([WALK_LEASE_WARNING_ID]);
});
