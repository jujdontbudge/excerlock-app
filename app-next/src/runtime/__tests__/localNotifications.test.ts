import { trialReminderPlan, openToUnlockPlan, notificationLanding } from '../../domain/notificationPlan';
import { LocalNotifications, LocalNotificationsBackend } from '../notifications/LocalNotifications';
const plan = openToUnlockPlan({ now: 1, alwaysDenied: true, targetMetWhileClosed: true })!;
test('trial reminder uses access expiry minus two days, never guesses missing expiry', () => {
  expect(trialReminderPlan({ status: 'trial', renewsAt: null, accessExpiresAt: '2026-09-20T00:00:00Z' }, 0)?.at).toBe(Date.parse('2026-09-18T00:00:00Z'));
  expect(trialReminderPlan({ status: 'trial', renewsAt: '2026-09-20T00:00:00Z' }, 0)).toBeNull();
  expect(trialReminderPlan({ status: 'active', renewsAt: null }, 0)).toBeNull();
});
test('open reminder only follows closed target discovery and Always denial', () => {
  expect(plan.id).toBe('open_to_unlock');
  expect(openToUnlockPlan({ now: 1, alwaysDenied: false, targetMetWhileClosed: true })).toBeNull();
  expect(openToUnlockPlan({ now: 1, alwaysDenied: true, targetMetWhileClosed: false })).toBeNull();
});
test('notification tap URLs are strictly allowlisted with actual propped route mapping', () => {
  expect(notificationLanding('excerlock://unlock/propped')).toBe('/unlock/treadmill');
  expect(notificationLanding('excerlock://home')).toBe('/home');
  expect(notificationLanding('excerlock://paywall')).toBe('/paywall');
  expect(notificationLanding('excerlock://dev')).toBeNull();
  expect(notificationLanding('https://evil.example')).toBeNull();
});
function setup() {
  let current = true;
  const backend: LocalNotificationsBackend = {
    permission: jest.fn(async () => 'granted'), schedule: jest.fn(async (p) => p.id), cancel: jest.fn(async () => {}),
  };
  return { backend, service: new LocalNotifications(backend, () => current), invalidate: () => { current = false; } };
}
test('disabled OS permission cancels previous plan and never schedules', async () => {
  const { backend, service } = setup(); backend.permission = async () => 'denied';
  await expect(service.schedule(plan)).rejects.toThrow('disabled');
  expect(backend.cancel).toHaveBeenCalledWith('open_to_unlock'); expect(backend.schedule).not.toHaveBeenCalled();
});
test('account change during native schedule cancels late request', async () => {
  const { backend, service, invalidate } = setup();
  backend.schedule = async () => { invalidate(); return 'open_to_unlock'; };
  await expect(service.schedule(plan)).rejects.toThrow('session changed');
  expect(backend.cancel).toHaveBeenCalledTimes(2);
});
test('fixed identifier updates serialize cancel-before-schedule', async () => {
  const { backend, service } = setup(); const calls: string[] = [];
  backend.cancel = async () => { calls.push('cancel'); };
  backend.schedule = async (p) => { calls.push('schedule'); return p.id; };
  await Promise.all([service.schedule(plan), service.schedule(plan)]);
  expect(calls).toEqual(['cancel', 'schedule', 'cancel', 'schedule']);
});

test('generation changing while queued cannot schedule for the new account', async () => {
  let generation = 1;
  const { backend } = setup();
  const service = new LocalNotifications(backend, () => true, () => generation);
  const scheduled = service.schedule(plan); generation = 2;
  await expect(scheduled).rejects.toThrow('session changed');
  expect(backend.schedule).not.toHaveBeenCalled();
});
