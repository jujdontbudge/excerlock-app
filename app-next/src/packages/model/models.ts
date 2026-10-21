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
  bank?: { points: number; pendingPoints: number; bankMinutes: number };
  showcase?: boolean;
  gait?: 'none' | 'walking' | 'still' | 'walking-then-still';
  motion?: 'walking' | 'still';
  id: string;
  title: string;
  onboarding: 'fresh' | `resumeAt:${string}` | 'complete';
  onboardingAnswers?: Record<string, string | number | boolean | number[] | string[]>;
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
  steps: { today: number; autoIncrementPerSecond?: number; pastFromHistory?: boolean };
  walking?: { script: ('walking' | 'still' | 'unknown')[]; stepMs: number };
  gym?: { places: SavedPlace[]; presence: 'inside' | 'outside'; accuracy?: number; autoDetect?: boolean; backgroundAsked?: boolean; optOut?: boolean };
  fakeSystemPrompts: 'grant' | 'deny' | 'ask';
  accessibility?: 'xl' | 'reduceMotion';
  identityLab?: IdentityLabScript;
  onboardingOffer?: { arm: 'a' | 'b' | 'unknown' | 'late' | 'error' | 'malformed'; assigned?: 'a' | 'b'; introEligible?: boolean; trialDays?: number; fallbackError?: boolean };
  purchaseRecovery?: 'pending' | 'accountConnection';
  ads?: {
    tracking?: 'granted' | 'denied' | 'undetermined';
    answer?: 'granted' | 'denied';
    failure?: 'start' | 'send';
    unconfigured?: boolean;
    sentBefore?: string[][];
    interruptedPurchase?: { vendorProductId: string; amount: number; currency: string };
  };
  admissionFailure?: 'storeNull' | 'storeTimeout' | 'serverError' | 'serverTimeout' | 'offline' | 'retry' | 'storeRetry' | 'serverUnknown';
  subscriptionProof?: 'matching' | 'ineligible' | 'wrongAccount' | 'wrongEnvironment' | 'unavailable';
  otaResumeRoute?: string;
  launchSignInRequired?: boolean;
  remoteFlags?: {
    signInRequired?: boolean;
    reviewPreset?: boolean;
    paywallVariant?: 'control' | 'variant_b' | 'error';
  };
};
export type IdentityLabScript = {
  anonymousSignIn?: 'ok' | 'failFirst';
  userSync?: 'ok' | 'failFirst' | 'slow';
  plans?: 'ok' | 'failFirst' | 'empty';
  appleLink?: 'ok' | 'conflict';
  googleSignIn?: 'success' | 'cancel';
  purchase?: 'success' | 'successWithoutAccess' | 'alreadyOwned' | 'cancel' | 'error' | 'errorFirst' | 'pending' | 'busyBarrier';
  restore?: 'restored' | 'notFound' | 'errorFirst';
  delayedCallbacks?: boolean;
  establishedTransfer?: boolean;
  secondSubscription?: boolean;
  concurrentRestore?: boolean;
  linkedProviders?: boolean;
  establishedProviderConflict?: boolean;
  localSignOut?: boolean;
  providerAttempts?: boolean;
  emailChallenges?: boolean;
  emailAccount?: 'new' | 'existing' | 'paid';
  emailRateLimited?: boolean;
  appleUnknown?: boolean;
  staleProductHandle?: boolean;
  storeGrant?: { owner: string; status: 'trial' | 'active' };
  storeTransaction?: { originalTransactionId: string; environment: 'Sandbox' | 'Production' | 'Xcode' };
  duplicatePurchaseCallback?: boolean;
  wrongStoreAccount?: boolean;
  independentRestore?: boolean;
  passiveEntry?: boolean;
  lifecycleRevocation?: boolean;
};
export type Unsubscribe = () => void;
