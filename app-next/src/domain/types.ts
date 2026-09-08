export type OpaqueSelectionHandle = { readonly token: string };
export type Activity = 'walking' | 'gym' | 'running' | 'biking';

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
  | { kind: 'target'; activity: 'walking'; metric: 'steps'; goal: number; place: WalkPlace }
  | { kind: 'target'; activity: 'walking'; metric: 'minutes'; goal: number; place: WalkPlace }
  | { kind: 'state'; activity: 'walking'; place: WalkPlace }
  | { kind: 'event'; activity: 'gym'; trigger: 'arrival' }
  | { kind: 'target'; activity: 'gym'; metric: 'minutes'; goal: number }
  | { kind: 'target'; activity: 'running'; metric: 'minutes'; goal: number }
  | { kind: 'target'; activity: 'running'; metric: 'distance'; goal: number; unit: 'km' | 'mi' }
  | { kind: 'target'; activity: 'biking'; metric: 'minutes'; goal: number }
  | { kind: 'target'; activity: 'biking'; metric: 'distance'; goal: number; unit: 'km' | 'mi' };

export type WalkPlace = 'outside' | 'treadmill' | 'either';

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
  appCount: number;
  categoryCount: number;
};

export type DayKey = string; // 'YYYY-MM-DD' in local time

export type RuleDay = {
  ruleId: string;
  day: DayKey;
  progress: number; // steps, minutes, km/mi — in the rule's own metric unit
  met: boolean;
  metAt: string | null; // ISO, local instant when it became met
  unit?: 'steps' | 'minutes' | 'km' | 'mi'; // optional for rows persisted before progress units were recorded
};

export type EarnedUnlock = {
  day: DayKey;
  ruleId: string;
  ruleName: string;
  metAt: string;
  windowEnd: string;
};

export type GymPresence = {
  placeId: string;
  confirmedAt: string;
  holdsUntil: string;
};

export type WalkingSession = {
  ruleId: string; // the state-mode rule it belongs to
  startedAt: string;
  leaseUntil: string; // Apple's 15-minute renewable lease; a lapsed lease ends the session
  phase: 'verifying' | 'walking' | 'grace' | 'ended';
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
};

export type Entitlement = {
  status: 'unknown' | 'none' | 'trial' | 'active' | 'expired' | 'billingIssue';
  renewsAt: string | null;
};
export type Session =
  | { kind: 'anonymous'; userId: string }
  | { kind: 'signedIn'; userId: string; provider: 'apple' | 'google' | 'email'; email: string | null };
export type PermissionStatus = 'notDetermined' | 'granted' | 'denied' | 'restricted';
export type Permissions = {
  screenTime: PermissionStatus;
  motion: PermissionStatus;
  location: 'notDetermined' | 'whenInUse' | 'always' | 'denied' | 'restricted';
  health: PermissionStatus;
  camera: PermissionStatus;
  notifications: PermissionStatus;
};

export type UnlockHint = {
  ruleId: string;
  action: 'walk' | 'arrive' | 'progress';
  remaining: number | null;
  goal: number | null;
  unit: string | null;
};
export type LockDecision =
  | { state: 'noRulesToday'; nextLockAt: string | null } // apps open, nothing scheduled today
  | { state: 'beforeWindow'; nextLockAt: string; ruleId: string; getAheadRuleId: string | null } // apps open, blocking starts later today
  | { state: 'locked'; activeRuleIds: string[]; nextUnlockHint: UnlockHint }
  | { state: 'unlockedMet'; byRuleId: string; byName: string; metAt: string; relockAt: string | null } // met today, open until next day's window
  | { state: 'unlockedProvisional'; byRuleId: string; placeId: string; holdsUntil: string }
  | { state: 'unlockedWalking'; sessionRuleId: string; leaseUntil: string }
  | { state: 'afterWindow'; nextLockAt: string | null }; // today's windows are over, apps open
