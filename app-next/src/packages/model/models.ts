import {
  Activity,
  DayKey,
  Permissions,
  Profile,
  Rule,
  RuleDay,
  LockedApps,
  Session,
  Entitlement,
} from './types';
export type SavedPlace = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
};
export type HistoryDay = {
  day: DayKey;
  usageMinutes: number | null;
  activity: Record<Activity, number>;
  met: boolean;
  scheduled: boolean;
};
export type Scenario = {
  gait?: 'none' | 'walking' | 'still';
  motion?: 'walking' | 'still';
  id: string;
  title: string;
  onboarding: 'fresh' | `resumeAt:${string}` | 'complete';
  onboardingAnswers?: Record<string, string | number | boolean | number[]>;
  profile?: Partial<Profile>;
  rules: Rule[];
  lockedApps: LockedApps;
  ruleDays: RuleDay[];
  clock: { now: string; timezone: string };
  permissions: Permissions;
  session: Session;
  entitlement: Entitlement;
  entitlementTimeline?: { status: Entitlement['status']; afterMs: number }[];
  usageMinutesToday: number | null;
  history: HistoryDay[];
  steps: { today: number; autoIncrementPerSecond?: number };
  walking?: { script: ('walking' | 'still' | 'unknown')[]; stepMs: number };
  gym?: { places: SavedPlace[]; presence: 'inside' | 'outside' };
  fakeSystemPrompts: 'grant' | 'deny' | 'ask';
  accessibility?: 'xl' | 'reduceMotion';
  identityLab?: IdentityLabScript;
  purchaseRecovery?: 'pending' | 'accountConnection';
  subscriptionProof?: 'matching' | 'ineligible' | 'wrongAccount' | 'wrongEnvironment' | 'unavailable';
  otaResumeRoute?: string;
  launchSignInRequired?: boolean;
};
export type IdentityLabScript = {
  anonymousSignIn?: 'ok' | 'failFirst';
  userSync?: 'ok' | 'failFirst' | 'slow';
  plans?: 'ok' | 'failFirst' | 'empty';
  appleLink?: 'ok' | 'conflict';
  googleSignIn?: 'success' | 'cancel';
  purchase?: 'success' | 'cancel' | 'error' | 'pending';
  restore?: 'restored' | 'notFound';
  delayedCallbacks?: boolean;
  establishedTransfer?: boolean;
  secondSubscription?: boolean;
  concurrentRestore?: boolean;
  establishedProviderConflict?: boolean;
  localSignOut?: boolean;
};
export type Unsubscribe = () => void;
