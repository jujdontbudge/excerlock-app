import { readFileSync } from 'fs';
import { join } from 'path';
import { SHIELD_OPEN_NOTIFICATION_ID } from '../../../ports/NotificationsPort';
import { createRuntime } from '../../../runtime/createRuntime';
import { ruleDaysStore } from '../../../state/ruleDaysStore';
import { requestHomeWalkingSheet } from '../../../features/home/homeSheetRequest';
import { NOTIFICATION_IDS, notificationKind, TRIAL_REMINDER_ID, WALK_LEASE_WARNING_ID } from '../catalog';
import { NOTIFICATION_LANDING, notificationLanding } from '../landing';
import { startNotifications } from '../startNotifications';
import { NotificationResponse, NotificationResponseSource } from '../ExpoNotificationsAdapter';

jest.mock('../../../features/home/homeSheetRequest', () => ({ requestHomeWalkingSheet: jest.fn() }));

function responseSource(launched: string | null = null) {
  const listeners = new Set<(response: NotificationResponse) => void>();
  let last = launched ? { identifier: launched } : null;
  const source: NotificationResponseSource = {
    last: () => last,
    clear: () => {
      last = null;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return { source, tap: (identifier: string) => listeners.forEach((listener) => listener({ identifier })), last: () => last };
}

test('each id lands on exactly one route', () => {
  expect(notificationLanding(TRIAL_REMINDER_ID)).toEqual({ kind: 'trialReminder', route: '/(tabs)/settings' });
  expect(notificationLanding(WALK_LEASE_WARNING_ID)).toEqual({ kind: 'walkLeaseWarning', route: '/(tabs)/home' });
  expect(notificationLanding(SHIELD_OPEN_NOTIFICATION_ID)).toEqual({ kind: 'shieldOpen', route: '/locked-apps' });
  expect(notificationLanding(`${SHIELD_OPEN_NOTIFICATION_ID}.lockWindow`)).toEqual({ kind: 'shieldOpen', route: '/locked-apps' });
  expect(notificationLanding('excerlock.shield.opener')).toBeNull();
  expect(notificationLanding('something-else')).toBeNull();
  expect(Object.keys(NOTIFICATION_LANDING).sort()).toEqual(Object.keys(NOTIFICATION_IDS).sort());
});

test('no landing route sits inside a ceremony, modal, onboarding or setup stack', () => {
  const guarded = ['/unlock', '/paywall', '/onboarding', '/setup', '/sign-in', '/builder', '/gym-picker', '/dev'];
  for (const route of Object.values(NOTIFICATION_LANDING))
    expect(guarded.some((prefix) => route.startsWith(prefix))).toBe(false);
});

test("the shield id's landing is registered outside every guard", () => {
  const navigator = readFileSync(join(__dirname, '..', '..', '..', 'features', 'launch', 'RootNavigator.tsx'), 'utf8');
  const registration = navigator.indexOf(`name="${NOTIFICATION_LANDING.shieldOpen.slice(1)}"`);
  expect(registration).toBeGreaterThan(-1);
  expect(registration).toBeLessThan(navigator.indexOf('Stack.Protected'));
});

test('a trial reminder tap opens Settings and records notification_opened', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('trial-active');
  const track = jest.spyOn(runtime.analytics, 'track');
  const navigate = jest.fn();
  const responses = responseSource();
  const stop = startNotifications(runtime, { responses: responses.source, navigate });
  responses.tap(TRIAL_REMINDER_ID);
  expect(navigate).toHaveBeenCalledWith('/(tabs)/settings');
  expect(track).toHaveBeenCalledWith('notification_opened', { kind: 'trialReminder' });
  stop();
  runtime.dispose();
});

test('a lease warning tap opens Home with the walking sheet for the live session', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-walking-session');
  const navigate = jest.fn();
  const responses = responseSource();
  const stop = startNotifications(runtime, { responses: responses.source, navigate });
  responses.tap(WALK_LEASE_WARNING_ID);
  expect(requestHomeWalkingSheet).toHaveBeenCalledWith('walk');
  expect(navigate).toHaveBeenCalledWith('/(tabs)/home');
  (requestHomeWalkingSheet as jest.Mock).mockClear();
  const session = ruleDaysStore.getState().data.walkingSession!;
  ruleDaysStore.getState().patch({ walkingSession: { ...session, phase: 'ended' } });
  responses.tap(WALK_LEASE_WARNING_ID);
  expect(requestHomeWalkingSheet).not.toHaveBeenCalled();
  expect(navigate).toHaveBeenLastCalledWith('/(tabs)/home');
  stop();
  runtime.dispose();
});

test('the response that launched the app is handled once and cleared; unknown ids are ignored', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  const navigate = jest.fn();
  const responses = responseSource(`${SHIELD_OPEN_NOTIFICATION_ID}.locked`);
  const stop = startNotifications(runtime, { responses: responses.source, navigate });
  expect(navigate).toHaveBeenCalledWith('/locked-apps');
  expect(responses.last()).toBeNull();
  responses.tap('com.apple.something');
  expect(navigate).toHaveBeenCalledTimes(1);
  stop();
  responses.tap(TRIAL_REMINDER_ID);
  expect(navigate).toHaveBeenCalledTimes(1);
  runtime.dispose();
});

test('the fake port delivers no responses, so the binding runs scheduling only', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  expect(() => startNotifications(runtime)()).not.toThrow();
  expect(notificationKind(TRIAL_REMINDER_ID)).toBe('trialReminder');
  runtime.dispose();
});
