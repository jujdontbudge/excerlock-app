export type OpaqueSelectionHandle = { readonly token: string };
export type Activity = 'walking' | 'gym';

export type Rule = {
  id: string; // uuid
  activity: Activity;
  mode: RuleMode;
  schedule: Schedule;
  enabled: boolean; // false = paused; a paused rule never locks and never counts
  createdAt: string; // ISO
  updatedAt: string;
};

export type RuleMode =
  | { kind: 'target'; activity: 'walking'; metric: 'steps' | 'minutes'; goal: number }
  | { kind: 'state'; activity: 'walking' }
  | { kind: 'event'; activity: 'gym'; trigger: 'arrival' }
  | { kind: 'target'; activity: 'gym'; metric: 'minutes'; goal: number };

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, JS convention

export type Schedule = {
  days: Weekday[]; // non-empty
  window: { kind: 'allDay' } | { kind: 'range'; startMinute: number; endMinute: number };
  // startMinute/endMinute are minutes after local midnight, 0..1439.
  // endMinute <= startMinute means the window crosses midnight and ends the next day.
  // startMinute === endMinute is invalid.
};

export type LockedApps = {
  handle: OpaqueSelectionHandle | null; // never contains app names or bundle ids
  isEmpty: boolean; // the only UI-visible selection metadata
};

export type DayKey = string; // 'YYYY-MM-DD' in local time

export type RuleDay = {
  ruleId: string;
  day: DayKey;
  progress: number; // steps, minutes, km/mi — in the rule's own metric unit
  met: boolean;
  metAt: string | null; // ISO, local instant when it became met
};

export type WalkingSession = {
  ruleId: string; // the state-mode rule it belongs to
  startedAt: string;
  leaseUntil: string; // Apple's 15-minute renewable lease; a lapsed lease ends the session
  phase: 'verifying' | 'walking' | 'grace' | 'ended';
};

export type GymPresence = {
  placeId: string; // the saved gym being confirmed or occupied
  startedAt: string; // ISO, when the 30-second presence confirmation began
  confirmedAt: string | null; // ISO once presence held for the full confirmation; null while confirming
};

export type Profile = {
  warmupRating?: number | null;
  name: string;
  referralSource: string; // one of the referral options
  ageBand: string; // option id
  occupation: string; // option id
  improveFirst: 'exercise' | 'screenTime' | 'wellness';
  mainReason: string; // option id from the motivation screen
  estimatedDailyMinutes: number; // from the scrolling-hours screen; permanent
  units: 'km' | 'mi'; // default from device locale; editable in Settings
  walkPlaces: Array<'treadmill' | 'outside'>; // preference/analytics only; never enforcement policy
};

export type Entitlement = {
  status: 'unknown' | 'none' | 'trial' | 'active' | 'expired' | 'billingIssue';
  renewsAt: string | null;
};
export type Session =
  { kind: 'anonymous' } | { kind: 'signedIn'; provider: 'apple' | 'google' | 'email'; email: string | null };
export type PermissionStatus = 'notDetermined' | 'granted' | 'denied' | 'restricted';
export type Permissions = {
  screenTime: PermissionStatus;
  motion: PermissionStatus;
  location: 'notDetermined' | 'whenInUse' | 'always' | 'denied';
  camera: PermissionStatus;
  notifications: PermissionStatus;
};

export type UnlockHint = {
  ruleId: string;
  action: 'walk' | 'arrive' | 'progress';
  remaining: number | null;
  unit: string | null;
};
export type LockDecision =
  | { state: 'noRulesToday' } // apps open, nothing scheduled today
  | { state: 'beforeWindow'; nextLockAt: string; ruleId: string } // apps open, blocking starts later today
  | { state: 'locked'; activeRuleIds: string[]; nextUnlockHint: UnlockHint }
  | { state: 'unlockedMet'; byRuleId: string; relockAt: string | null } // met today, open until next day's window
  | { state: 'unlockedWalking'; sessionRuleId: string; leaseUntil: string }
  | { state: 'unlockedAtGym'; ruleId: string; placeId: string } // confirmed at a saved gym; relocks on leaving
  | { state: 'afterWindow'; nextLockAt: string | null }; // today's windows are over, apps open
