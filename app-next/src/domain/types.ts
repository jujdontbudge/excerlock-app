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
  | { kind: 'state'; activity: 'walking' | 'gym' }
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

export type WalkingDetection = { state: 'active' | 'inactive' | 'unknown'; since: string | null };
export type PlacementEvidence = { state: 'propped' | 'handheld' | 'unknown'; liveRelief: boolean; since: string | null };

export type GymPresence = {
  placeId: string; // the saved gym being confirmed or occupied
  startedAt: string; // ISO, when the presence confirmation began
  confirmedAt: string | null; // ISO once presence held for the full confirmation; null while confirming
};

export type Profile = {
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
  accessExpiresAt?: string | null;
  willRenew?: boolean | null;
  isInGracePeriod?: boolean;
  isLifetime?: boolean;
  observedAt?: string;
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
  | { state: 'noRulesToday'; nextLockAt: string | null }
  | { state: 'beforeWindow'; nextLockAt: string; ruleId: string; getAheadRuleId: string | null }
  | { state: 'locked'; activeRuleIds: string[]; nextUnlockHint: UnlockHint }
  | { state: 'unlockedMet'; byRuleId: string; byName: string; metAt: string; relockAt: string | null }
  | { state: 'unlockedWalking'; ruleId: string; since: string }
  | { state: 'unlockedPropped'; ruleId: string; since: string }
  | { state: 'unlockedAtGym'; ruleId: string; placeId: string; since: string }
  | { state: 'afterWindow'; nextLockAt: string | null };
