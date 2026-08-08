export type AppStage =
  | 'onboarding'
  | 'paywall'
  | 'signup'
  | 'home'
  | 'builder';

export type OnboardingStep =
  | 'value'
  | 'confession'
  | 'mirror'
  | 'privacy'
  | 'screen-time'
  | 'apps'
  | 'motion'
  | 'health'
  | 'location'
  | 'allowance'
  | 'review'
  | 'done';

export type ConditionKind = 'event' | 'state' | 'rate';
export type ActiveWindowMode =
  | 'anytime'
  | 'start-only'
  | 'end-only'
  | 'start-end'
  | 'guided';
export type BuilderStep =
  | 'catalog'
  | 'place'
  | 'configure-event'
  | 'configure-state'
  | 'configure-rate'
  | 'reward'
  | 'banner'
  | 'preview';
export type RewardKind = 'fixed' | 'rest-of-day' | 'set-period';
export type HomeMode =
  | 'first-home-empty'
  | 'locked'
  | 'unlocked'
  | 'low'
  | 'unlimited'
  | 'rest-of-day'
  | 'set-period'
  | 'rest-day-no-locking'
  | 'outside-window';
export type AccessHolidayKind =
  | 'restOfDay'
  | 'setPeriod'
  | 'restDayNoLocking'
  | 'outsideLockWindow';
export type AccessHolidayState = {
  kind: AccessHolidayKind;
  sourceConditionId: string | null;
  sourceName: string;
  expiresAt: string;
  durationMinutes: number | null;
};
export type WalkPhase =
  | 'ready'
  | 'verifying'
  | 'active'
  | 'paused'
  | 'grace'
  | 'ended-by-user'
  | 'ended-stopped'
  | 'permission-lost';
export type GymPhase = 'ready' | 'verifying' | 'verified' | 'failed';
export type AccountStatus = 'postPurchase' | 'signedInDemo' | 'signedOutDemo';
export type NotificationKind = 'afternoonNudge' | 'weeklyRecap' | 'streakLastCall';
export type NotificationDestination = 'home-earn' | 'analysis-share' | 'home-streak';
export type PermissionHealth = 'attention' | 'healthy';
export type SubscriptionStatus = 'trial' | 'active' | 'cancelled';
export type PermissionOutcome = 'notAsked' | 'allowed' | 'denied';
export type OnboardingPermissionKey = 'screenTime' | 'motion' | 'health' | 'location';
export type ReviewTrigger = 'fifthUnlock' | 'sevenDays' | 'thirtyDays';
export type ReviewPromptOrigin = 'automatic' | 'manual' | 'debug';
export type ReviewPromptState =
  | 'eligible'
  | 'presented'
  | 'dismissed'
  | 'rated'
  | 'suppressedAfterShield'
  | 'stoppedAfterThree';

export type RuleWeekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';
export type RuleDayMode = 'active' | 'rest' | 'custom';

export type WeeklyConditionRewardOverride =
  | { kind: 'off' }
  | { kind: 'fixed'; minutes: number }
  | { kind: 'rest-of-day' }
  | { kind: 'set-period'; minutes: number };

export type WeeklyRuleConfig = {
  dayModes: Record<RuleWeekday, RuleDayMode>;
  restBehaviors: Record<RuleWeekday, 'no-locking' | 'allowance-only'>;
  customValues: Record<RuleWeekday, {
    allowance: string;
    window: string;
    rewardOverrides: Record<string, WeeklyConditionRewardOverride>;
  }>;
  lockWindowEnabled: boolean;
  lockWindowFrom: string;
  lockWindowTo: string;
  plannedDaysOff: Array<{ date: string; label: string }>;
  todayRestReason: string | null;
};

export type SavedGym = {
  id: string;
  name: string;
  radiusMeters: number;
  detection: 'manual' | 'auto';
  placeType: 'verified' | 'honor';
  wifi: 'off' | 'sample';
  autoPermission: 'notAsked' | 'granted' | 'denied';
};

export type DemoCondition = {
  id: string;
  catalogId: string;
  kind: ConditionKind;
  name: string;
  context?: string;
  todayStatus: 'ready' | 'completed' | 'inactive' | 'active' | 'crediting';
  enabled: boolean;
  gymId?: string;
  bannerId: string;
  reward?: {
    kind: RewardKind;
    minutes?: number;
  };
  eventThreshold: number | null;
  stateGraceSeconds: number | null;
  rateMinutes: number | null;
  activeWindow: BuilderDraft['activeWindow'];
  activeWindowStartMinutes: number | null;
  activeWindowEndMinutes: number | null;
  dailyCap: number | 'unlimited' | null;
  cooldownMinutes: number | null;
  cooldownRemainingMinutes: number;
  completionCountToday: number;
  repeatable: boolean | null;
  ruleSummary: string;
};

export type AnalysisActivity = {
  conditionId: string;
  dayKey: string;
  qualifyingMinutes: number;
};

export type BuilderDraft = {
  active: boolean;
  editingConditionId: string | null;
  step: BuilderStep;
  path: readonly BuilderStep[];
  catalogId: string | null;
  kind: ConditionKind | null;
  name: string;
  enabled: boolean;
  gymId: string | null;
  eventThreshold: number | null;
  stateGraceSeconds: number | null;
  rateMinutes: number | null;
  reward: RewardKind | null;
  rewardMinutes: number | null;
  bannerId: string | null;
  activeWindow: ActiveWindowMode;
  activeWindowStartMinutes: number | null;
  activeWindowEndMinutes: number | null;
  dailyCap: number | 'unlimited' | null;
  cooldownMinutes: number | null;
  repeatable: boolean | null;
};

export type DemoState = {
  stage: AppStage;
  activeTab: 'home' | 'manage' | 'analysis' | 'settings';
  clock: {
    dayKey: string;
    minuteOfDay: number;
  };
  onboarding: {
    step: OnboardingStep;
    phoneUseHours: number | null;
    allowanceMinutes: number | 'unlimited' | null;
    selectedApps: string[];
    permissionOutcomes: Record<OnboardingPermissionKey, PermissionOutcome>;
    /** Compatibility mirror while the onboarding view migrates to permissionOutcomes. */
    motionPermission: PermissionOutcome;
  };
  account: {
    status: AccountStatus;
    email: string;
  };
  selectedPlan: 'annual' | 'monthly' | null;
  home: {
    mode: HomeMode;
    remainingMinutes: number;
    earnedMinutesToday: number;
    screenTimeUsedMinutes: number;
    balanceOnHold: boolean;
    accessHoliday: AccessHolidayState | null;
    earnTransition: {
      conditionIds: string[];
      pendingMinutes: number;
      targetMode: HomeMode;
      balanceOnHold: boolean;
      accessHoliday: AccessHolidayState | null;
    } | null;
  };
  conditions: DemoCondition[];
  nextConditionSequence: number;
  builder: BuilderDraft;
  savedGyms: SavedGym[];
  sessions: {
    walk: WalkPhase;
    walkConditionId: string | null;
    gym: GymPhase;
    gymConditionId: string | null;
  };
  analysis: {
    history: 'empty' | 'populated';
    presentationMode: 'natural' | 'showcase';
    currentStreakDays: number;
    activityCount: number;
    activityLedger: AnalysisActivity[];
    streakDayKeys: string[];
    timeLockedMinutes: number;
    milestoneShelfSeen: boolean;
    newBadgeIds: string[];
  };
  rules: {
    allowanceMinutes: number | 'unlimited';
    rolloverEnabled: boolean;
    rolloverCapMinutes: number;
    missedDayPolicy: 'reset' | 'grace';
    weekly: WeeklyRuleConfig;
  };
  settings: {
    notifications: boolean;
    notificationChoices: Record<NotificationKind, boolean>;
    notificationPermissionPreviewed: boolean;
    notificationPermissionOutcome: PermissionOutcome;
    nudgeTime: '2:00 PM' | '3:00 PM' | '4:00 PM';
    haptics: boolean;
    sounds: boolean;
    walkAlwaysShow: boolean;
    appearance: 'auto' | 'light' | 'dark';
    dayBoundary: 'midnight' | '2:00 AM' | '3:00 AM' | '4:00 AM' | '5:00 AM';
    healthConnected: boolean;
    shortcuts: Record<'balance' | 'walking' | 'gym', boolean>;
    startWeek: 'device' | 'sunday' | 'monday';
    units: 'miles' | 'kilometers';
    permissionHealth: PermissionHealth;
    subscriptionOffer: 'standard' | 'annual-winback';
    subscriptionStatus: SubscriptionStatus;
  };
  review: {
    installAgeDays: number;
    unlockCount: number;
    eligibleTrigger: ReviewTrigger | null;
    prompt: ReviewPromptState;
    promptOrigin: ReviewPromptOrigin | null;
    automaticShowCount: number;
    automaticSuppressedPermanently: boolean;
    shieldSuppressionActive: boolean;
    shieldSuppressionRemainingMinutes: number;
    handledTriggers: ReviewTrigger[];
  };
  notification: {
    kind: NotificationKind | null;
    phase: 'idle' | 'unopened' | 'tapped';
    destination: NotificationDestination | null;
  };
  systemClaims: {
    locationRead: false;
    healthRead: false;
    notificationDelivered: false;
    purchaseCharged: false;
    accountCreated: false;
    appsBlocked: false;
  };
};

export type DemoAction =
  | { type: 'onboarding/continue' }
  | { type: 'onboarding/back' }
  | { type: 'onboarding/set-step'; step: OnboardingStep }
  | { type: 'onboarding/set-phone-use'; hours: number }
  | { type: 'onboarding/set-allowance'; minutes: number | 'unlimited' }
  | { type: 'onboarding/set-apps'; appIds: string[] }
  | { type: 'onboarding/toggle-app'; appId: string }
  | {
      type: 'onboarding/set-permission';
      permission: OnboardingPermissionKey;
      value: PermissionOutcome;
    }
  | { type: 'onboarding/set-motion-permission'; value: DemoState['onboarding']['motionPermission'] }
  | { type: 'paywall/select-plan'; plan: 'annual' | 'monthly' }
  | { type: 'paywall/purchase-succeeded'; plan?: 'annual' | 'monthly' }
  | { type: 'account/complete-signup' }
  | { type: 'account/sign-out' }
  | { type: 'account/sign-in' }
  | { type: 'tab/select'; tab: DemoState['activeTab'] }
  | { type: 'builder/start' }
  | { type: 'builder/start-edit'; conditionId: string }
  | { type: 'builder/cancel' }
  | { type: 'builder/select-catalog'; catalogId: string }
  | { type: 'builder/set-name'; name: string }
  | { type: 'builder/set-enabled'; enabled: boolean }
  | { type: 'builder/set-place'; gymId: string }
  | { type: 'builder/set-event-threshold'; value: number }
  | { type: 'builder/set-state-grace'; seconds: number }
  | { type: 'builder/set-rate-minutes'; minutes: number }
  | { type: 'builder/set-reward'; reward: RewardKind; minutes?: number }
  | { type: 'builder/set-banner'; bannerId: string }
  | { type: 'builder/set-active-window'; value: BuilderDraft['activeWindow'] }
  | { type: 'builder/set-active-window-time'; edge: 'start' | 'end'; minutes: number }
  | { type: 'builder/set-daily-cap'; value: number | 'unlimited' }
  | { type: 'builder/set-cooldown'; minutes: number }
  | { type: 'builder/set-repeatable'; value: boolean }
  | { type: 'builder/continue' }
  | { type: 'builder/back' }
  | { type: 'builder/save' }
  | { type: 'condition/complete-event'; conditionId: string }
  | { type: 'condition/advance-clock'; minutes: number }
  | { type: 'condition/toggle'; conditionId: string; enabled: boolean }
  | { type: 'condition/remove'; conditionId: string }
  | { type: 'condition/move'; conditionId: string; direction: 'up' | 'down' }
  | { type: 'home/settle-earn' }
  | { type: 'home/set-access-holiday'; kind: AccessHolidayKind }
  | { type: 'home/set-mode'; mode: HomeMode }
  | { type: 'walk/start'; conditionId?: string }
  | { type: 'walk/cancel' }
  | { type: 'walk/verified' }
  | { type: 'walk/pause' }
  | { type: 'walk/enter-grace' }
  | { type: 'walk/resume' }
  | { type: 'walk/end'; reason: 'user' | 'stopped' }
  | { type: 'gym/start'; conditionId?: string }
  | { type: 'gym/cancel' }
  | { type: 'gym/verified' }
  | { type: 'gym/fail' }
  | {
      type: 'analysis/record-activity';
      conditionId: string;
      dayKey?: string;
      qualifyingMinutes: number;
    }
  | { type: 'analysis/mark-milestone-shelf-seen' }
  | { type: 'analysis/clear-badge-new'; badgeId: string }
  | { type: 'settings/toggle'; key: 'notifications' | 'haptics'; value: boolean }
  | { type: 'settings/set-notification-kind'; kind: NotificationKind; value: boolean }
  | { type: 'settings/mark-notification-permission-previewed' }
  | { type: 'settings/set-notification-permission-previewed'; value: boolean }
  | { type: 'settings/set-notification-permission-outcome'; value: PermissionOutcome }
  | { type: 'settings/set-nudge-time'; value: DemoState['settings']['nudgeTime'] }
  | { type: 'settings/set-appearance'; value: DemoState['settings']['appearance'] }
  | { type: 'settings/set-day-boundary'; value: DemoState['settings']['dayBoundary'] }
  | { type: 'settings/set-health-connected'; value: boolean }
  | { type: 'settings/set-permission-health'; value: PermissionHealth }
  | { type: 'settings/set-shortcut'; shortcutId: keyof DemoState['settings']['shortcuts']; value: boolean }
  | { type: 'settings/set-start-week'; value: DemoState['settings']['startWeek'] }
  | { type: 'settings/set-subscription-offer'; offer: DemoState['settings']['subscriptionOffer'] }
  | { type: 'settings/set-subscription'; status: SubscriptionStatus }
  | { type: 'settings/set-units'; value: DemoState['settings']['units'] }
  | { type: 'settings/set-sounds'; value: boolean }
  | { type: 'settings/set-walk-always-show'; value: boolean }
  | { type: 'rules/set-allowance'; minutes: number | 'unlimited' }
  | { type: 'rules/set-rollover'; enabled: boolean; capMinutes?: number }
  | { type: 'rules/set-streak-policy'; policy: 'reset' | 'grace' }
  | { type: 'rules/set-weekly'; weekly: WeeklyRuleConfig }
  | { type: 'rules/use-rest-day-today'; reason: string }
  | { type: 'gym/add-sample'; gymId?: string }
  | { type: 'gym/save'; gym: SavedGym }
  | { type: 'gym/remove'; gymId: string }
  | { type: 'gym/set-radius'; gymId: string; radiusMeters: number }
  | { type: 'gym/set-detection'; gymId: string; detection: 'manual' | 'auto' }
  | { type: 'review/record-unlock' }
  | { type: 'review/record-streak'; trigger: Exclude<ReviewTrigger, 'fifthUnlock'> }
  | { type: 'review/set-install-age-days'; days: number }
  | { type: 'review/open-manual-rate' }
  | { type: 'review/suppress-after-shield' }
  | { type: 'review/advance-clock'; minutes: number }
  | { type: 'review/dismiss' }
  | { type: 'review/rate' }
  | { type: 'notification/open-preview'; kind: NotificationKind }
  | { type: 'notification/tap' }
  | { type: 'notification/dismiss' }
  | { type: 'debug/seed-showcase' }
  | { type: 'debug/clear-conditions' }
  | { type: 'debug/set-walk'; phase: WalkPhase }
  | { type: 'debug/set-gym'; phase: GymPhase }
  | { type: 'debug/set-account'; status: AccountStatus }
  | { type: 'debug/set-permission-health'; health: PermissionHealth }
  | { type: 'debug/set-subscription'; status: SubscriptionStatus }
  | { type: 'debug/set-analysis'; history: 'empty' | 'populated'; newBadgeId?: string }
  | { type: 'debug/set-clock'; dayKey: string; minuteOfDay: number }
  | {
      type: 'debug/set-review';
      prompt: ReviewPromptState;
      trigger: ReviewTrigger | null;
      automaticShowCount?: number;
      automaticSuppressedPermanently?: boolean;
    }
  | { type: 'debug/reset' };
