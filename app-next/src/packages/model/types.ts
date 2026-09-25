export type OpaqueSelectionHandle = { readonly token: string };
export type Activity = 'walking' | 'gym';

export type Rule = {
  id: string;
  activity: Activity;
  mode: RuleMode;
  schedule: Schedule;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RuleMode =
  | { kind: 'target'; activity: 'walking'; metric: 'steps' | 'minutes'; goal: number }
  | { kind: 'state'; activity: 'walking' | 'gym' }
  | { kind: 'event'; activity: 'gym'; trigger: 'arrival' }
  | { kind: 'target'; activity: 'gym'; metric: 'minutes'; goal: number };

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Schedule = {
  days: Weekday[];
  window: { kind: 'allDay' } | { kind: 'range'; startMinute: number; endMinute: number };
};

export type LockedApps = {
  handle: OpaqueSelectionHandle | null;
  isEmpty: boolean;
};

export type DayKey = string;

export type RuleDay = {
  ruleId: string;
  day: DayKey;
  progress: number;
  met: boolean;
  metAt: string | null;
};

export type WalkingDetection = { state: 'active' | 'inactive' | 'unknown'; since: string | null };
export type PlacementEvidence = { state: 'propped' | 'handheld' | 'unknown'; liveRelief: boolean; since: string | null };

export type GymPresence = {
  placeId: string;
  startedAt: string;
  confirmedAt: string | null;
};

export type Profile = {
  name: string;
  referralSource: string;
  ageBand: string;
  occupation: string;
  improveFirst: 'exercise' | 'screenTime' | 'wellness';
  mainReason: string;
  estimatedDailyMinutes: number;
  units: 'km' | 'mi';
  walkPlaces: ('treadmill' | 'outside')[];
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
