import type { Entitlement } from '../model/types';
export type LocalNotificationId = 'trial_ending' | 'open_to_unlock' | 'background_check' | 'shield_open';
export const BACKGROUND_CHECK_MS = 3 * 60_000;
export const BACKGROUND_CHECK_RENEW_MS = 60_000;
export type NotificationLanding = 'excerlock://home' | 'excerlock://unlock/propped' | 'excerlock://paywall';
export type LocalNotificationPlan = { id: Exclude<LocalNotificationId, 'shield_open'>; at: number; title: string; body: string; url: NotificationLanding };
export function trialReminderPlan(entitlement: Entitlement, now: number): LocalNotificationPlan | null {
  if (entitlement.status !== 'trial' || !entitlement.accessExpiresAt) return null;
  const at = Date.parse(entitlement.accessExpiresAt) - 2 * 86400000;
  if (!Number.isFinite(now) || !Number.isFinite(at) || at <= now) return null;
  return { id: 'trial_ending', at, title: 'Your trial ends in two days', body: 'Review your ExcerLock subscription before your trial ends.', url: 'excerlock://paywall' };
}
export function openToUnlockPlan(input: { now: number; alwaysDenied: boolean; targetMetWhileClosed: boolean }): LocalNotificationPlan | null {
  if (!Number.isFinite(input.now) || !input.alwaysDenied || !input.targetMetWhileClosed) return null;
  return { id: 'open_to_unlock', at: input.now, title: 'Your walking goal is complete', body: 'Open ExcerLock to update your app access.', url: 'excerlock://home' };
}
export function backgroundCheckPlan(now: number): LocalNotificationPlan | null {
  if (!Number.isFinite(now)) return null;
  return { id: 'background_check', at: now + BACKGROUND_CHECK_MS, title: 'ExcerLock stopped in the background', body: 'iOS closed ExcerLock, so walking can no longer lock or unlock your apps. Tap to turn it back on.', url: 'excerlock://home' };
}
export function notificationLanding(value: unknown): '/home' | '/unlock/treadmill' | '/paywall' | null {
  switch (value) {
    case 'excerlock://home': return '/home';
    case 'excerlock://unlock/propped': return '/unlock/treadmill';
    case 'excerlock://paywall': return '/paywall';
    default: return null;
  }
}
