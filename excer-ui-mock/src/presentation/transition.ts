import {
  BUILDER_PATHS,
  CATALOG_KIND,
  EMPTY_BUILDER,
  ONBOARDING_STEPS,
  SHOWCASE_CONDITIONS,
  createDemoState,
} from './fixtures';
import { conditionsHaveBankingConflict, getBuilderRuleSummary } from './builderRules';
import {
  getBalanceDerivedHomeMode,
  getCurrentBalanceMinutes,
  getCurrentRuleAccess,
  getEffectiveEventReward,
  getEffectiveRateMinutes,
  isRestDayForStreak,
  isConditionExecutableNow,
} from './executionPolicy';
import { canContinueBuilder, getOnboardingScreen } from './selectors';
import type {
  AccessHolidayKind,
  AccessHolidayState,
  BuilderDraft,
  DemoAction,
  DemoCondition,
  DemoState,
  HomeMode,
  NotificationDestination,
  RewardKind,
} from './types';

const notificationDestinations: Record<
  Exclude<DemoState['notification']['kind'], null>,
  NotificationDestination
> = {
  afternoonNudge: 'home-earn',
  weeklyRecap: 'analysis-share',
  streakLastCall: 'home-streak',
};

const accessModes: Record<
  Extract<DemoAction, { type: 'home/set-access-holiday' }>['kind'],
  HomeMode
> = {
  restOfDay: 'rest-of-day',
  setPeriod: 'set-period',
  restDayNoLocking: 'rest-day-no-locking',
  outsideLockWindow: 'outside-window',
};

const accessKindsByMode: Partial<Record<HomeMode, AccessHolidayKind>> = {
  'rest-of-day': 'restOfDay',
  'set-period': 'setPeriod',
  'rest-day-no-locking': 'restDayNoLocking',
  'outside-window': 'outsideLockWindow',
};

function formatExpiryFromSevenPm(durationMinutes: number) {
  const minutes = (19 * 60 + durationMinutes) % (24 * 60);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${period}`;
}

function eventAccessHoliday(
  state: DemoState,
  condition: DemoCondition,
  reward: { kind: Exclude<RewardKind, 'fixed'>; minutes?: number },
): AccessHolidayState {
  const durationMinutes = reward.kind === 'set-period' ? reward.minutes ?? 90 : null;
  return {
    kind: reward.kind === 'rest-of-day' ? 'restOfDay' : 'setPeriod',
    sourceConditionId: condition.id,
    sourceName: condition.name,
    expiresAt: reward.kind === 'rest-of-day'
      ? state.settings.dayBoundary === 'midnight' ? 'Midnight' : state.settings.dayBoundary
      : formatExpiryFromSevenPm(durationMinutes ?? 90),
    durationMinutes,
  };
}

function fixtureAccessHoliday(state: DemoState, kind: AccessHolidayKind): AccessHolidayState {
  if (kind === 'restOfDay' || kind === 'setPeriod') {
    const rewardKind = kind === 'restOfDay' ? 'rest-of-day' : 'set-period';
    const source = state.conditions.find(
      (condition) => condition.enabled && condition.kind === 'event' && condition.reward?.kind === rewardKind,
    );
    if (source) {
      return eventAccessHoliday(state, source, {
        kind: rewardKind,
        minutes: source.reward?.minutes,
      });
    }
    const fallback = state.conditions.find(
      (condition) => condition.enabled && condition.kind === 'event',
    );
    return {
      kind,
      sourceConditionId: fallback?.id ?? null,
      sourceName: fallback?.name ?? (kind === 'restOfDay' ? 'Go to gym' : 'Distance goal'),
      expiresAt: kind === 'restOfDay' ? 'Midnight' : '8:30 PM',
      durationMinutes: kind === 'setPeriod' ? 90 : null,
    };
  }
  return {
    kind,
    sourceConditionId: null,
    sourceName: kind === 'restDayNoLocking' ? 'Sunday Rest day rule' : 'Weekly lock window',
    expiresAt: kind === 'restDayNoLocking' ? 'Midnight' : '7:00 PM',
    durationMinutes: null,
  };
}

const nameForCatalog = (catalogId: string): string => {
  const names: Record<string, string> = {
    'gym-arrive': 'Go to gym',
    'gym-present': 'At the gym',
    'gym-time': 'Gym time exchange',
    'walk-state': 'While walking',
    'walk-steps-rate': 'Steps exchange',
    'walk-steps-event': 'Step goal',
    'run-distance-event': 'Running distance goal',
    'run-distance-rate': 'Running distance exchange',
    'cycle-distance-event': 'Cycling distance goal',
    'cycle-distance-rate': 'Cycling distance exchange',
    'swim-distance-event': 'Swimming distance goal',
    'swim-distance-rate': 'Swimming distance exchange',
    'calories-event': 'Active-calorie goal',
    'calories-rate': 'Active-calorie exchange',
    'active-minutes-event': 'Active-minutes goal',
    'active-minutes-rate': 'Active-minutes exchange',
    'workout-duration-event': 'Finish any workout',
  };
  return names[catalogId] ?? 'Movement condition';
};

function updateBuilder(state: DemoState, patch: Partial<BuilderDraft>): DemoState {
  return { ...state, builder: { ...state.builder, ...patch } };
}

function allocateConditionId(state: DemoState) {
  let sequence = Number.isSafeInteger(state.nextConditionSequence)
    ? Math.max(1, state.nextConditionSequence)
    : 1;
  while (state.conditions.some((condition) => condition.id === `condition-${sequence}`)) {
    sequence += 1;
  }
  return {
    id: `condition-${sequence}`,
    nextConditionSequence: sequence + 1,
  };
}

function considerAutomaticReviewCandidate(
  state: DemoState,
  trigger: NonNullable<DemoState['review']['eligibleTrigger']>,
): DemoState {
  const { review } = state;
  if (
    review.installAgeDays < 3 ||
    review.automaticSuppressedPermanently ||
    review.handledTriggers.includes(trigger)
  ) {
    return state;
  }
  if (review.automaticShowCount >= 3) {
    return {
      ...state,
      review: { ...review, prompt: 'stoppedAfterThree', promptOrigin: null },
    };
  }

  if (review.shieldSuppressionActive || review.shieldSuppressionRemainingMinutes > 0) {
    return {
      ...state,
      review: {
        ...review,
        eligibleTrigger: trigger,
        prompt: 'suppressedAfterShield',
        promptOrigin: null,
      },
    };
  }

  const handledTriggers = [...review.handledTriggers, trigger];
  return {
    ...state,
    review: {
      ...review,
      eligibleTrigger: trigger,
      prompt: 'presented',
      promptOrigin: 'automatic',
      automaticShowCount: review.automaticShowCount + 1,
      handledTriggers,
    },
  };
}

function recordReviewUnlock(state: DemoState): DemoState {
  const unlockCount = state.review.unlockCount + 1;
  const nextState: DemoState = {
    ...state,
    review: { ...state.review, unlockCount },
  };
  return unlockCount >= 5
    ? considerAutomaticReviewCandidate(nextState, 'fifthUnlock')
    : nextState;
}

function streakLength(state: DemoState, dayKeys: readonly string[]) {
  const uniqueDays = [...new Set(dayKeys)].sort();
  if (uniqueDays.length === 0) return 0;
  const activityDays = new Set(uniqueDays);
  let cursor = Date.parse(`${uniqueDays[uniqueDays.length - 1]}T12:00:00Z`);
  let length = 0;
  for (let scanned = 0; scanned < 3660 && Number.isFinite(cursor); scanned += 1) {
    const dayKey = new Date(cursor).toISOString().slice(0, 10);
    if (activityDays.has(dayKey)) length += 1;
    else if (!isRestDayForStreak(state, dayKey)) break;
    cursor -= 86_400_000;
  }
  return length;
}

function meetsMeaningfulActivityFloor(condition: DemoCondition, qualifyingMinutes: number) {
  if (condition.kind === 'event') return qualifyingMinutes >= 1;
  if (condition.kind === 'state') return qualifyingMinutes >= 10;
  return qualifyingMinutes >= 15;
}

function recordAnalysisActivity(
  state: DemoState,
  conditionId: string,
  dayKey: string,
  qualifyingMinutes: number,
): DemoState {
  const condition = state.conditions.find((item) => item.id === conditionId);
  const executionState = dayKey === state.clock.dayKey
    ? state
    : { ...state, clock: { ...state.clock, dayKey } };
  if (
    !condition
    || !isConditionExecutableNow(executionState, condition)
    || !meetsMeaningfulActivityFloor(condition, qualifyingMinutes)
    || state.analysis.activityLedger.some(
      (activity) => activity.conditionId === conditionId && activity.dayKey === dayKey,
    )
  ) {
    return state;
  }
  const activityLedger = [
    ...state.analysis.activityLedger,
    { conditionId, dayKey, qualifyingMinutes },
  ];
  const streakDayKeys = state.analysis.streakDayKeys.includes(dayKey)
    ? state.analysis.streakDayKeys
    : [...state.analysis.streakDayKeys, dayKey];
  const activityCount = activityLedger.length;
  const currentStreakDays = streakLength(state, streakDayKeys);
  const earnsFirstBadge = activityCount === 1 && !state.analysis.newBadgeIds.includes('activity-1');
  let nextState: DemoState = {
    ...state,
    analysis: {
      ...state.analysis,
      activityCount,
      activityLedger,
      currentStreakDays,
      history: 'populated',
      streakDayKeys,
      milestoneShelfSeen: earnsFirstBadge ? false : state.analysis.milestoneShelfSeen,
      newBadgeIds: earnsFirstBadge
        ? [...state.analysis.newBadgeIds, 'activity-1']
        : state.analysis.newBadgeIds,
    },
  };
  const rateMinutes = dayKey === state.clock.dayKey
    ? getEffectiveRateMinutes(executionState, condition)
    : null;
  if (condition.kind === 'rate' && rateMinutes !== null) {
    const withEarnedRate: DemoState = {
      ...nextState,
      home: {
        ...nextState.home,
        earnedMinutesToday: nextState.home.earnedMinutesToday + rateMinutes,
      },
    };
    const remainingMinutes = getCurrentBalanceMinutes(withEarnedRate);
    const withRateBalance: DemoState = {
      ...withEarnedRate,
      home: {
        ...withEarnedRate.home,
        remainingMinutes,
      },
    };
    nextState = withRateBalance.home.balanceOnHold
      ? withRateBalance
      : {
          ...withRateBalance,
          home: {
            ...withRateBalance.home,
            mode: getBalanceDerivedHomeMode(withRateBalance),
          },
        };
  }
  if (currentStreakDays >= 30 && nextState.review.handledTriggers.includes('sevenDays')) {
    nextState = considerAutomaticReviewCandidate(nextState, 'thirtyDays');
  } else if (currentStreakDays >= 7 && nextState.review.handledTriggers.includes('fifthUnlock')) {
    nextState = considerAutomaticReviewCandidate(nextState, 'sevenDays');
  }
  return nextState;
}

function reconcileCurrentRuleAccess(state: DemoState): DemoState {
  const withCurrentAllowance: DemoState = {
    ...state,
    home: {
      ...state.home,
      remainingMinutes: getCurrentBalanceMinutes(state),
    },
  };
  const access = getCurrentRuleAccess(withCurrentAllowance);
  if (access) {
    return {
      ...withCurrentAllowance,
      home: {
        ...withCurrentAllowance.home,
        mode: access.mode,
        balanceOnHold: true,
        accessHoliday: {
          kind: access.mode === 'rest-day-no-locking' ? 'restDayNoLocking' : 'outsideLockWindow',
          sourceConditionId: null,
          sourceName: access.sourceName,
          expiresAt: access.expiresAt,
          durationMinutes: null,
        },
        earnTransition: null,
      },
    };
  }
  if (state.home.mode === 'rest-of-day' || state.home.mode === 'set-period') {
    return withCurrentAllowance;
  }
  return {
    ...withCurrentAllowance,
    home: {
      ...withCurrentAllowance.home,
      mode: getBalanceDerivedHomeMode(withCurrentAllowance),
      balanceOnHold: false,
      accessHoliday: null,
      earnTransition: null,
    },
  };
}

const SHOWCASE_STREAK_DAY_KEYS = [
  '2026-07-27',
  '2026-07-28',
  '2026-07-29',
  '2026-07-30',
  '2026-07-31',
  '2026-08-01',
  '2026-08-02',
  '2026-08-03',
  '2026-08-04',
  '2026-08-05',
  '2026-08-06',
  '2026-08-07',
] as const;

function showcaseActivityLedger(): DemoState['analysis']['activityLedger'] {
  return Array.from({ length: 43 }, (_, index) => ({
    conditionId: `sample-condition-${Math.floor(index / SHOWCASE_STREAK_DAY_KEYS.length) + 1}`,
    dayKey: SHOWCASE_STREAK_DAY_KEYS[index % SHOWCASE_STREAK_DAY_KEYS.length],
    qualifyingMinutes: 15,
  }));
}

function showcaseAnalysisState(newBadgeId?: string): DemoState['analysis'] {
  return {
    history: 'populated',
    presentationMode: 'showcase',
    currentStreakDays: SHOWCASE_STREAK_DAY_KEYS.length,
    activityCount: 43,
    activityLedger: showcaseActivityLedger(),
    streakDayKeys: [...SHOWCASE_STREAK_DAY_KEYS],
    timeLockedMinutes: 134,
    milestoneShelfSeen: newBadgeId === undefined,
    newBadgeIds: newBadgeId ? [newBadgeId] : [],
  };
}

function builderPathFor(catalogId: string, kind: DemoCondition['kind']) {
  if (!catalogId.startsWith('gym-')) return BUILDER_PATHS[kind].filter((step) => step !== 'place');
  if (kind === 'event') return BUILDER_PATHS.event;
  return ['catalog', 'place', ...BUILDER_PATHS[kind].slice(1)] as const;
}

function canEventComplete(state: DemoState, condition: DemoCondition) {
  if (
    !isConditionExecutableNow(state, condition)
    || condition.kind !== 'event'
    || condition.todayStatus === 'crediting'
  ) {
    return false;
  }
  const completionCountToday = condition.completionCountToday ?? 0;
  if ((condition.cooldownRemainingMinutes ?? 0) > 0) return false;
  if (!condition.repeatable && completionCountToday >= 1) return false;
  return condition.dailyCap === 'unlimited'
    || condition.dailyCap === null
    || condition.dailyCap === undefined
    || completionCountToday < condition.dailyCap;
}

function saveBuilder(state: DemoState): DemoState {
  const { builder } = state;
  const selectedGym = builder.gymId
    ? state.savedGyms.find((gym) => gym.id === builder.gymId)
    : undefined;
  if (
    builder.step !== 'preview' ||
    !builder.catalogId ||
    !builder.kind ||
    !builder.bannerId ||
    !builder.name.trim() ||
    (builder.catalogId.startsWith('gym-') && !selectedGym) ||
    !canContinueBuilder(state)
  ) {
    return state;
  }

  const existing = builder.editingConditionId
    ? state.conditions.find((item) => item.id === builder.editingConditionId)
    : undefined;
  if (
    builder.enabled
    && state.conditions.some((item) =>
      item.id !== builder.editingConditionId
      && item.enabled
      && conditionsHaveBankingConflict({
        catalogId: builder.catalogId!,
        gymId: selectedGym?.id,
        kind: builder.kind,
      }, item),
    )
  ) {
    return state;
  }
  const allocation = existing ? null : allocateConditionId(state);
  const condition: DemoCondition = {
    id: existing?.id ?? allocation!.id,
    catalogId: builder.catalogId,
    kind: builder.kind,
    name: builder.name.trim().slice(0, 60),
    context: selectedGym?.name,
    todayStatus: existing?.todayStatus
      ?? (builder.kind === 'event' ? 'ready' : builder.kind === 'state' ? 'inactive' : 'crediting'),
    enabled: builder.enabled,
    gymId: selectedGym?.id,
    bannerId: builder.bannerId,
    reward: builder.reward
      ? { kind: builder.reward, minutes: builder.rewardMinutes ?? undefined }
      : undefined,
    eventThreshold: builder.kind === 'event' ? builder.eventThreshold : null,
    stateGraceSeconds: builder.kind === 'state' ? builder.stateGraceSeconds : null,
    rateMinutes: builder.kind === 'rate' ? builder.rateMinutes : null,
    activeWindow: builder.activeWindow,
    activeWindowStartMinutes: builder.activeWindowStartMinutes,
    activeWindowEndMinutes: builder.activeWindowEndMinutes,
    dailyCap: builder.kind === 'event' ? builder.dailyCap : null,
    cooldownMinutes: builder.kind === 'event' ? builder.cooldownMinutes : null,
    cooldownRemainingMinutes: existing?.cooldownRemainingMinutes ?? 0,
    completionCountToday: existing?.completionCountToday ?? 0,
    repeatable: builder.kind === 'event' ? builder.repeatable : null,
    ruleSummary: getBuilderRuleSummary(
      builder,
      state.settings.units,
      selectedGym?.name,
    ),
  };

  const conditions = existing
    ? state.conditions.map((item) => item.id === existing.id ? condition : item)
    : [...state.conditions, condition];

  return {
    ...state,
    stage: 'home',
    conditions,
    nextConditionSequence: allocation?.nextConditionSequence ?? state.nextConditionSequence,
    home: {
      ...state.home,
      mode: 'locked',
      balanceOnHold: false,
      accessHoliday: null,
      earnTransition: null,
    },
    builder: { ...EMPTY_BUILDER },
  };
}

export function transitionDemo(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'onboarding/set-step':
      return {
        ...state,
        stage: 'onboarding',
        onboarding: { ...state.onboarding, step: action.step },
      };
    case 'onboarding/set-phone-use':
      return {
        ...state,
        onboarding: { ...state.onboarding, phoneUseHours: action.hours },
      };
    case 'onboarding/set-allowance':
      return {
        ...state,
        onboarding: { ...state.onboarding, allowanceMinutes: action.minutes },
        rules: { ...state.rules, allowanceMinutes: action.minutes },
      };
    case 'onboarding/set-apps':
      return {
        ...state,
        onboarding: {
          ...state.onboarding,
          selectedApps: [...new Set(action.appIds)],
        },
      };
    case 'onboarding/set-permission':
      return {
        ...state,
        onboarding: {
          ...state.onboarding,
          permissionOutcomes: {
            ...state.onboarding.permissionOutcomes,
            [action.permission]: action.value,
          },
          motionPermission:
            action.permission === 'motion'
              ? action.value
              : state.onboarding.motionPermission,
        },
      };
    case 'onboarding/set-motion-permission':
      return {
        ...state,
        onboarding: {
          ...state.onboarding,
          permissionOutcomes: {
            ...state.onboarding.permissionOutcomes,
            motion: action.value,
          },
          motionPermission: action.value,
        },
      };
    case 'onboarding/toggle-app': {
      const selected = state.onboarding.selectedApps.includes(action.appId);
      return {
        ...state,
        onboarding: {
          ...state.onboarding,
          selectedApps: selected
            ? state.onboarding.selectedApps.filter((id) => id !== action.appId)
            : [...state.onboarding.selectedApps, action.appId],
        },
      };
    }
    case 'onboarding/continue': {
      if (!getOnboardingScreen(state).canContinue) return state;
      const index = ONBOARDING_STEPS.indexOf(state.onboarding.step);
      if (index === ONBOARDING_STEPS.length - 1) {
        return { ...state, stage: 'paywall' };
      }
      return {
        ...state,
        onboarding: { ...state.onboarding, step: ONBOARDING_STEPS[index + 1] },
      };
    }
    case 'onboarding/back': {
      const index = ONBOARDING_STEPS.indexOf(state.onboarding.step);
      if (index <= 0) return state;
      return {
        ...state,
        onboarding: { ...state.onboarding, step: ONBOARDING_STEPS[index - 1] },
      };
    }
    case 'paywall/select-plan':
      return {
        ...state,
        selectedPlan: action.plan,
        settings: { ...state.settings, subscriptionOffer: 'standard' },
      };
    case 'paywall/purchase-succeeded': {
      const selectedPlan = action.plan ?? state.selectedPlan;
      if (!selectedPlan) return state;
      return {
        ...state,
        selectedPlan,
        stage: 'signup',
        account: { ...state.account, status: 'postPurchase' },
        settings: {
          ...state.settings,
          subscriptionOffer: 'standard',
          subscriptionStatus: selectedPlan === 'annual' ? 'trial' : 'active',
        },
      };
    }
    case 'account/complete-signup':
      return {
        ...state,
        stage: 'home',
        activeTab: 'home',
        account: { ...state.account, status: 'signedInDemo' },
        conditions: [],
        home: {
          mode: state.rules.allowanceMinutes === 'unlimited' ? 'unlimited' : 'first-home-empty',
          remainingMinutes: 0,
          earnedMinutesToday: 0,
          screenTimeUsedMinutes: state.onboarding.allowanceMinutes === 'unlimited'
            ? 0
            : state.onboarding.allowanceMinutes ?? 45,
          balanceOnHold: false,
          accessHoliday: null,
          earnTransition: null,
        },
      };
    case 'account/sign-in':
      return {
        ...state,
        account: { ...state.account, status: 'signedInDemo' },
      };
    case 'account/sign-out':
      return { ...state, account: { ...state.account, status: 'signedOutDemo' } };
    case 'tab/select':
      return { ...state, activeTab: action.tab };
    case 'builder/start':
      return {
        ...state,
        stage: 'builder',
        builder: { ...EMPTY_BUILDER, active: true },
      };
    case 'builder/start-edit': {
      const condition = state.conditions.find((item) => item.id === action.conditionId);
      if (!condition) return state;
      const path = builderPathFor(condition.catalogId, condition.kind).filter(
        (step) => step !== 'catalog',
      );
      return {
        ...state,
        stage: 'builder',
        builder: {
          ...EMPTY_BUILDER,
          active: true,
          editingConditionId: condition.id,
          step: path.includes(`configure-${condition.kind}`) ? `configure-${condition.kind}` : path[0],
          path,
          catalogId: condition.catalogId,
          kind: condition.kind,
          name: condition.name,
          enabled: condition.enabled,
          gymId: condition.gymId ?? state.savedGyms.find((gym) => gym.name === condition.context)?.id ?? null,
          eventThreshold: condition.eventThreshold,
          stateGraceSeconds: condition.stateGraceSeconds,
          rateMinutes: condition.rateMinutes,
          reward: condition.reward?.kind ?? null,
          rewardMinutes: condition.reward?.minutes ?? null,
          bannerId: condition.bannerId,
          activeWindow: condition.activeWindow,
          activeWindowStartMinutes: condition.activeWindowStartMinutes,
          activeWindowEndMinutes: condition.activeWindowEndMinutes,
          dailyCap: condition.dailyCap,
          cooldownMinutes: condition.cooldownMinutes,
          repeatable: condition.repeatable,
        },
      };
    }
    case 'builder/cancel':
      return { ...state, stage: 'home', builder: { ...EMPTY_BUILDER } };
    case 'builder/select-catalog': {
      if (state.builder.editingConditionId) return state;
      const kind = CATALOG_KIND[action.catalogId];
      if (!kind) return state;
      const path = builderPathFor(action.catalogId, kind);
      return updateBuilder(state, {
        catalogId: action.catalogId,
        kind,
        name: nameForCatalog(action.catalogId),
        enabled: true,
        gymId: null,
        eventThreshold: null,
        stateGraceSeconds: null,
        rateMinutes: null,
        reward: null,
        rewardMinutes: null,
        bannerId: null,
        activeWindow: 'anytime',
        activeWindowStartMinutes: null,
        activeWindowEndMinutes: null,
        dailyCap: null,
        cooldownMinutes: null,
        repeatable: null,
        path,
        step: path[1],
      });
    }
    case 'builder/set-name':
      return updateBuilder(state, { name: action.name.slice(0, 60) });
    case 'builder/set-enabled':
      return updateBuilder(state, { enabled: action.enabled });
    case 'builder/set-place':
      return updateBuilder(state, { gymId: action.gymId });
    case 'builder/set-event-threshold':
      return state.builder.catalogId === 'gym-arrive'
        ? state
        : updateBuilder(state, { eventThreshold: action.value });
    case 'builder/set-state-grace':
      return updateBuilder(state, { stateGraceSeconds: action.seconds });
    case 'builder/set-rate-minutes':
      return updateBuilder(state, { rateMinutes: action.minutes });
    case 'builder/set-reward':
      return updateBuilder(state, {
        reward: action.reward,
        rewardMinutes: action.minutes ?? null,
      });
    case 'builder/set-banner':
      return updateBuilder(state, { bannerId: action.bannerId });
    case 'builder/set-active-window': {
      const startSelected = action.value === 'start-only'
        || action.value === 'start-end'
        || action.value === 'guided';
      const endSelected = action.value === 'end-only'
        || action.value === 'start-end'
        || action.value === 'guided';
      return updateBuilder(state, {
        activeWindow: action.value,
        activeWindowStartMinutes: startSelected
          ? state.builder.activeWindowStartMinutes
          : null,
        activeWindowEndMinutes: endSelected
          ? state.builder.activeWindowEndMinutes
          : null,
      });
    }
    case 'builder/set-active-window-time':
      return updateBuilder(state, {
        [action.edge === 'start' ? 'activeWindowStartMinutes' : 'activeWindowEndMinutes']:
          Math.max(0, Math.min(1439, Math.round(action.minutes))),
      });
    case 'builder/set-daily-cap':
      return updateBuilder(state, { dailyCap: action.value });
    case 'builder/set-cooldown':
      return updateBuilder(state, { cooldownMinutes: action.minutes });
    case 'builder/set-repeatable':
      return updateBuilder(state, { repeatable: action.value });
    case 'builder/continue': {
      if (!canContinueBuilder(state)) return state;
      const index = state.builder.path.indexOf(state.builder.step);
      const next = state.builder.path[index + 1];
      return next ? updateBuilder(state, { step: next }) : state;
    }
    case 'builder/back': {
      const index = state.builder.path.indexOf(state.builder.step);
      const previous = state.builder.path[index - 1];
      return previous ? updateBuilder(state, { step: previous }) : state;
    }
    case 'builder/save':
      return saveBuilder(state);
    case 'condition/complete-event': {
      const condition = state.conditions.find((item) => item.id === action.conditionId);
      if (
        !condition
        || !canEventComplete(state, condition)
        || state.home.mode === 'rest-day-no-locking'
        || state.home.mode === 'outside-window'
      ) return state;
      const reward = getEffectiveEventReward(state, condition);
      if (reward.kind === 'off') return state;
      const rewardTargetMode: HomeMode =
        reward.kind === 'rest-of-day'
          ? 'rest-of-day'
          : reward.kind === 'set-period'
            ? 'set-period'
            : 'unlocked';
      const existingTransition = state.home.earnTransition;
      const existingHoliday = existingTransition?.accessHoliday ?? state.home.accessHoliday;
      const accessHoliday = reward.kind === 'rest-of-day'
        ? eventAccessHoliday(state, condition, { kind: 'rest-of-day' })
        : reward.kind === 'set-period'
          ? eventAccessHoliday(state, condition, { kind: 'set-period', minutes: reward.minutes })
          : existingHoliday;
      const targetMode = reward.kind === 'fixed'
        ? existingTransition?.targetMode
          ?? (state.home.mode === 'rest-of-day' || state.home.mode === 'set-period'
            ? state.home.mode
            : rewardTargetMode)
        : rewardTargetMode;
      return {
        ...state,
        home: {
          ...state.home,
          earnTransition: {
            conditionIds: [...(existingTransition?.conditionIds ?? []), action.conditionId],
            pendingMinutes: (existingTransition?.pendingMinutes ?? 0) + (reward.kind === 'fixed' ? reward.minutes : 0),
            targetMode,
            balanceOnHold: (existingTransition?.balanceOnHold ?? state.home.balanceOnHold) || reward.kind !== 'fixed',
            accessHoliday,
          },
        },
        conditions: state.conditions.map((item) =>
          item.id === action.conditionId
            ? {
                ...item,
                completionCountToday: (item.completionCountToday ?? 0) + 1,
                cooldownRemainingMinutes: item.repeatable ? item.cooldownMinutes ?? 0 : 0,
                todayStatus: 'crediting',
              }
            : item,
        ),
      };
    }
    case 'condition/advance-clock': {
      const elapsed = Math.max(0, Math.floor(action.minutes));
      return {
        ...state,
        conditions: state.conditions.map((condition) => {
          if (condition.kind !== 'event' || (condition.cooldownRemainingMinutes ?? 0) <= 0) {
            return condition;
          }
          const cooldownRemainingMinutes = Math.max(
            0,
            (condition.cooldownRemainingMinutes ?? 0) - elapsed,
          );
          const capAvailable = condition.dailyCap === 'unlimited'
            || condition.dailyCap === null
            || condition.dailyCap === undefined
            || (condition.completionCountToday ?? 0) < condition.dailyCap;
          return {
            ...condition,
            cooldownRemainingMinutes,
            todayStatus: cooldownRemainingMinutes === 0
              && condition.repeatable
              && capAvailable
              && condition.todayStatus === 'completed'
              ? 'ready'
              : condition.todayStatus,
          };
        }),
      };
    }
    case 'home/settle-earn': {
      const pending = state.home.earnTransition;
      if (!pending) return state;
      const nextState: DemoState = {
        ...state,
        home: {
          ...state.home,
          mode: pending.targetMode,
          remainingMinutes: state.home.remainingMinutes + pending.pendingMinutes,
          earnedMinutesToday: state.home.earnedMinutesToday + pending.pendingMinutes,
          balanceOnHold: pending.balanceOnHold,
          accessHoliday: pending.balanceOnHold
            ? pending.accessHoliday ?? state.home.accessHoliday
            : null,
          earnTransition: null,
        },
        conditions: state.conditions.map((item) => {
          if (!pending.conditionIds.includes(item.id)) return item;
          const capAvailable = item.dailyCap === 'unlimited'
            || item.dailyCap === null
            || item.dailyCap === undefined
            || (item.completionCountToday ?? 0) < item.dailyCap;
          return {
            ...item,
            todayStatus: item.repeatable
              && capAvailable
              && (item.cooldownRemainingMinutes ?? 0) === 0
              ? 'ready'
              : 'completed',
          };
        }),
      };
      const settledConditionIds = [...new Set(pending.conditionIds)].filter((conditionId) =>
        nextState.conditions.some((condition) => condition.id === conditionId),
      );
      const withAnalysis = settledConditionIds.reduce(
        (current, conditionId) => recordAnalysisActivity(
          current,
          conditionId,
          current.clock.dayKey,
          1,
        ),
        nextState,
      );
      return settledConditionIds.length > 0 ? recordReviewUnlock(withAnalysis) : withAnalysis;
    }
    case 'condition/toggle': {
      const toggled = state.conditions.find((item) => item.id === action.conditionId);
      if (
        action.enabled
        && toggled
        && state.conditions.some((item) =>
          item.id !== toggled.id
          && item.enabled
          && conditionsHaveBankingConflict(toggled, item),
        )
      ) {
        return state;
      }
      return {
        ...state,
        conditions: state.conditions.map((item) =>
          item.id === action.conditionId ? { ...item, enabled: action.enabled } : item,
        ),
      };
    }
    case 'condition/remove': {
      const conditions = state.conditions.filter((item) => item.id !== action.conditionId);
      const customValues = Object.fromEntries(
        Object.entries(state.rules.weekly.customValues).map(([day, values]) => {
          const rewardOverrides = { ...values.rewardOverrides };
          delete rewardOverrides[action.conditionId];
          return [day, { ...values, rewardOverrides }];
        }),
      ) as DemoState['rules']['weekly']['customValues'];
      return {
        ...state,
        conditions,
        home: {
          ...state.home,
          mode: conditions.length === 0 ? 'first-home-empty' : state.home.mode,
          accessHoliday: state.home.accessHoliday?.sourceConditionId === action.conditionId
            ? { ...state.home.accessHoliday, sourceConditionId: null }
            : state.home.accessHoliday,
          earnTransition: state.home.earnTransition
            ? {
                ...state.home.earnTransition,
                conditionIds: state.home.earnTransition.conditionIds.filter((id) => id !== action.conditionId),
              }
            : null,
        },
        rules: {
          ...state.rules,
          weekly: { ...state.rules.weekly, customValues },
        },
      };
    }
    case 'condition/move': {
      const index = state.conditions.findIndex((item) => item.id === action.conditionId);
      if (index < 0) return state;
      const target = action.direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= state.conditions.length) return state;
      const conditions = [...state.conditions];
      [conditions[index], conditions[target]] = [conditions[target], conditions[index]];
      return { ...state, conditions };
    }
    case 'home/set-access-holiday': {
      const mode = accessModes[action.kind];
      return {
        ...state,
        home: {
          ...state.home,
          mode,
          balanceOnHold: true,
          accessHoliday: fixtureAccessHoliday(state, action.kind),
          earnTransition: null,
        },
      };
    }
    case 'home/set-mode': {
      const holidayKind = accessKindsByMode[action.mode];
      return {
        ...state,
        home: {
          ...state.home,
          mode: action.mode,
          remainingMinutes: action.mode === 'unlocked' ? 30 : action.mode === 'low' ? 10 : state.home.remainingMinutes,
          balanceOnHold: [
            'rest-of-day',
            'set-period',
            'rest-day-no-locking',
            'outside-window',
          ].includes(action.mode),
          accessHoliday: holidayKind ? fixtureAccessHoliday(state, holidayKind) : null,
          earnTransition: null,
        },
      };
    }
    case 'walk/start': {
      const condition = state.conditions.find((item) =>
        item.id === action.conditionId
        && item.catalogId === 'walk-state',
      ) ?? (!action.conditionId
        ? state.conditions.find((item) => item.catalogId === 'walk-state')
        : undefined);
      if (!condition || !isConditionExecutableNow(state, condition)) return state;
      return {
        ...state,
        sessions: {
          ...state.sessions,
          walk: 'verifying',
          walkConditionId: condition.id,
        },
      };
    }
    case 'walk/cancel':
      return {
        ...state,
        sessions: { ...state.sessions, walk: 'ready', walkConditionId: null },
      };
    case 'walk/verified': {
      const condition = state.conditions.find((item) => item.id === state.sessions.walkConditionId);
      if (
        state.sessions.walk !== 'verifying'
        || !condition
        || !isConditionExecutableNow(state, condition)
      ) return state;
      return { ...state, sessions: { ...state.sessions, walk: 'active' } };
    }
    case 'walk/pause':
      return state.sessions.walk === 'active'
        ? { ...state, sessions: { ...state.sessions, walk: 'paused' } }
        : state;
    case 'walk/enter-grace':
      return state.sessions.walk === 'paused'
        ? { ...state, sessions: { ...state.sessions, walk: 'grace' } }
        : state;
    case 'walk/resume': {
      const condition = state.conditions.find((item) => item.id === state.sessions.walkConditionId);
      return (state.sessions.walk === 'paused' || state.sessions.walk === 'grace')
        && condition
        && isConditionExecutableNow(state, condition)
        ? { ...state, sessions: { ...state.sessions, walk: 'active' } }
        : state;
    }
    case 'walk/end': {
      const wasCompletable = ['active', 'paused', 'grace'].includes(state.sessions.walk);
      const condition = state.conditions.find((item) => item.id === state.sessions.walkConditionId);
      const nextState: DemoState = {
        ...state,
        sessions: {
          ...state.sessions,
          walk: action.reason === 'user' ? 'ended-by-user' : 'ended-stopped',
        },
      };
      return wasCompletable && condition && isConditionExecutableNow(state, condition)
        ? recordAnalysisActivity(nextState, condition.id, state.clock.dayKey, 24)
        : nextState;
    }
    case 'gym/start': {
      const condition = state.conditions.find((item) =>
        item.id === action.conditionId
        && item.catalogId.startsWith('gym-'),
      ) ?? (!action.conditionId
        ? state.conditions.find((item) => item.catalogId.startsWith('gym-'))
        : undefined);
      if (!condition || !isConditionExecutableNow(state, condition)) return state;
      return {
        ...state,
        sessions: {
          ...state.sessions,
          gym: 'verifying',
          gymConditionId: condition.id,
        },
      };
    }
    case 'gym/cancel':
      return {
        ...state,
        sessions: { ...state.sessions, gym: 'ready', gymConditionId: null },
      };
    case 'gym/verified': {
      const condition = state.conditions.find((item) => item.id === state.sessions.gymConditionId);
      if (
        state.sessions.gym !== 'verifying'
        || !condition
        || !isConditionExecutableNow(state, condition)
      ) return state;
      return { ...state, sessions: { ...state.sessions, gym: 'verified' } };
    }
    case 'gym/fail':
      return { ...state, sessions: { ...state.sessions, gym: 'failed' } };
    case 'analysis/record-activity':
      return recordAnalysisActivity(
        state,
        action.conditionId,
        action.dayKey ?? state.clock.dayKey,
        action.qualifyingMinutes,
      );
    case 'analysis/mark-milestone-shelf-seen':
      return {
        ...state,
        analysis: { ...state.analysis, milestoneShelfSeen: true },
      };
    case 'analysis/clear-badge-new':
      return {
        ...state,
        analysis: {
          ...state.analysis,
          newBadgeIds: state.analysis.newBadgeIds.filter((badgeId) => badgeId !== action.badgeId),
        },
      };
    case 'settings/toggle':
      return {
        ...state,
        settings: { ...state.settings, [action.key]: action.value },
      };
    case 'settings/set-notification-kind': {
      const notificationChoices = {
        ...state.settings.notificationChoices,
        [action.kind]: action.value,
      };
      return {
        ...state,
        settings: {
          ...state.settings,
          notificationChoices,
          notifications: Object.values(notificationChoices).some(Boolean),
        },
      };
    }
    case 'settings/mark-notification-permission-previewed':
      return {
        ...state,
        settings: {
          ...state.settings,
          notificationPermissionPreviewed: true,
          notificationPermissionOutcome: state.settings.notificationPermissionOutcome === 'notAsked'
            ? 'denied'
            : state.settings.notificationPermissionOutcome,
        },
      };
    case 'settings/set-notification-permission-previewed':
      return {
        ...state,
        settings: { ...state.settings, notificationPermissionPreviewed: action.value },
      };
    case 'settings/set-notification-permission-outcome':
      return {
        ...state,
        settings: {
          ...state.settings,
          notificationPermissionOutcome: action.value,
          notificationPermissionPreviewed: action.value !== 'notAsked',
        },
      };
    case 'settings/set-nudge-time':
      return { ...state, settings: { ...state.settings, nudgeTime: action.value } };
    case 'settings/set-appearance':
      return { ...state, settings: { ...state.settings, appearance: action.value } };
    case 'settings/set-day-boundary':
      return { ...state, settings: { ...state.settings, dayBoundary: action.value } };
    case 'settings/set-health-connected':
      return { ...state, settings: { ...state.settings, healthConnected: action.value } };
    case 'settings/set-permission-health':
      return { ...state, settings: { ...state.settings, permissionHealth: action.value } };
    case 'settings/set-shortcut':
      return {
        ...state,
        settings: {
          ...state.settings,
          shortcuts: { ...state.settings.shortcuts, [action.shortcutId]: action.value },
        },
      };
    case 'settings/set-start-week':
      return { ...state, settings: { ...state.settings, startWeek: action.value } };
    case 'settings/set-subscription-offer':
      return { ...state, settings: { ...state.settings, subscriptionOffer: action.offer } };
    case 'settings/set-subscription':
      return { ...state, settings: { ...state.settings, subscriptionStatus: action.status } };
    case 'settings/set-units':
      return { ...state, settings: { ...state.settings, units: action.value } };
    case 'settings/set-sounds':
      return { ...state, settings: { ...state.settings, sounds: action.value } };
    case 'settings/set-walk-always-show':
      return { ...state, settings: { ...state.settings, walkAlwaysShow: action.value } };
    case 'rules/set-allowance':
      return reconcileCurrentRuleAccess({
        ...state,
        rules: { ...state.rules, allowanceMinutes: action.minutes },
      });
    case 'rules/set-rollover':
      return {
        ...state,
        rules: {
          ...state.rules,
          rolloverEnabled: action.enabled,
          rolloverCapMinutes: action.capMinutes ?? state.rules.rolloverCapMinutes,
        },
      };
    case 'rules/set-streak-policy':
      return {
        ...state,
        rules: { ...state.rules, missedDayPolicy: action.policy },
      };
    case 'rules/set-weekly': {
      const nextState: DemoState = {
        ...state,
        rules: {
          ...state.rules,
          weekly: {
            ...action.weekly,
            dayModes: { ...action.weekly.dayModes },
            restBehaviors: { ...action.weekly.restBehaviors },
            customValues: Object.fromEntries(
              Object.entries(action.weekly.customValues).map(([day, values]) => [day, {
                ...values,
                rewardOverrides: Object.fromEntries(
                  Object.entries(values.rewardOverrides).map(([conditionId, override]) => [conditionId, { ...override }]),
                ),
              }]),
            ) as DemoState['rules']['weekly']['customValues'],
            plannedDaysOff: action.weekly.plannedDaysOff.map((day) => ({ ...day })),
          },
        },
      };
      return reconcileCurrentRuleAccess(nextState);
    }
    case 'rules/use-rest-day-today': {
      const reason = action.reason.trim();
      if (!reason) return state;
      const nextState: DemoState = {
        ...state,
        rules: {
          ...state.rules,
          weekly: { ...state.rules.weekly, todayRestReason: reason },
        },
      };
      return reconcileCurrentRuleAccess(nextState);
    }
    case 'gym/add-sample': {
      if (state.savedGyms.length >= 5) return state;
      const id = action.gymId ?? (state.savedGyms.length === 0 ? 'harbor-strength' : 'northside');
      if (state.savedGyms.some((gym) => gym.id === id)) return state;
      return {
        ...state,
        savedGyms: [
          ...state.savedGyms,
          {
            id,
            name: id === 'northside' ? 'Northside Community Gym' : 'Harbor Strength',
            radiusMeters: 100,
            detection: 'manual',
            placeType: id === 'northside' ? 'honor' : 'verified',
            wifi: 'off',
            autoPermission: 'notAsked',
          },
        ],
      };
    }
    case 'gym/save': {
      const previous = state.savedGyms.find((gym) => gym.id === action.gym.id);
      if (!previous && state.savedGyms.length >= 5) return state;
      const boundedGym = {
        ...action.gym,
        name: action.gym.name.trim().slice(0, 60),
        radiusMeters: Math.max(50, Math.min(200, action.gym.radiusMeters)),
      };
      if (!boundedGym.name) return state;
      return {
        ...state,
        conditions: previous && previous.name !== boundedGym.name
          ? state.conditions.map((condition) => condition.gymId === boundedGym.id || condition.context === previous.name ? {
              ...condition,
              gymId: boundedGym.id,
              context: boundedGym.name,
              ruleSummary: condition.ruleSummary.replace(previous.name, boundedGym.name),
            } : condition)
          : state.conditions,
        savedGyms: previous
          ? state.savedGyms.map((gym) => gym.id === boundedGym.id ? boundedGym : gym)
          : [...state.savedGyms, boundedGym],
      };
    }
    case 'gym/remove': {
      const removed = state.savedGyms.find((gym) => gym.id === action.gymId);
      return {
        ...state,
        conditions: removed
          ? state.conditions.map((condition) => condition.gymId === removed.id || condition.context === removed.name ? {
              ...condition,
              enabled: false,
              ruleSummary: 'Needs attention · choose another saved gym',
            } : condition)
          : state.conditions,
        savedGyms: state.savedGyms.filter((gym) => gym.id !== action.gymId),
      };
    }
    case 'gym/set-radius':
      return {
        ...state,
        savedGyms: state.savedGyms.map((gym) =>
          gym.id === action.gymId ? { ...gym, radiusMeters: action.radiusMeters } : gym,
        ),
      };
    case 'gym/set-detection':
      return {
        ...state,
        savedGyms: state.savedGyms.map((gym) =>
          gym.id === action.gymId ? { ...gym, detection: action.detection } : gym,
        ),
      };
    case 'review/record-unlock':
      return recordReviewUnlock(state);
    case 'review/record-streak':
      return considerAutomaticReviewCandidate(state, action.trigger);
    case 'review/set-install-age-days': {
      const installAgeDays = Math.max(0, Math.floor(action.days));
      const nextState: DemoState = {
        ...state,
        review: {
          ...state.review,
          installAgeDays,
        },
      };
      return nextState.review.unlockCount >= 5
        ? considerAutomaticReviewCandidate(nextState, 'fifthUnlock')
        : nextState;
    }
    case 'review/open-manual-rate':
      return {
        ...state,
        review: {
          ...state.review,
          eligibleTrigger: null,
          prompt: 'presented',
          promptOrigin: 'manual',
          automaticSuppressedPermanently: true,
        },
      };
    case 'review/suppress-after-shield': {
      const suppressesVisibleAutomaticPrompt =
        state.review.prompt === 'presented' &&
        state.review.promptOrigin !== 'manual';
      return {
        ...state,
        review: {
          ...state.review,
          prompt: suppressesVisibleAutomaticPrompt
            ? 'suppressedAfterShield'
            : state.review.prompt,
          promptOrigin: suppressesVisibleAutomaticPrompt
            ? null
            : state.review.promptOrigin,
          shieldSuppressionActive: true,
          shieldSuppressionRemainingMinutes: 30,
          handledTriggers: suppressesVisibleAutomaticPrompt && state.review.eligibleTrigger
            ? state.review.handledTriggers.filter((trigger) => trigger !== state.review.eligibleTrigger)
            : state.review.handledTriggers,
        },
      };
    }
    case 'review/advance-clock': {
      const shieldSuppressionRemainingMinutes = Math.max(
        0,
        state.review.shieldSuppressionRemainingMinutes - Math.max(0, action.minutes),
      );
      const nextState: DemoState = {
        ...state,
        review: {
          ...state.review,
          shieldSuppressionActive: shieldSuppressionRemainingMinutes > 0,
          shieldSuppressionRemainingMinutes,
        },
      };
      return shieldSuppressionRemainingMinutes === 0
        && nextState.review.prompt === 'suppressedAfterShield'
        && nextState.review.eligibleTrigger
        ? considerAutomaticReviewCandidate(nextState, nextState.review.eligibleTrigger)
        : nextState;
    }
    case 'review/dismiss': {
      if (state.review.prompt !== 'presented') return state;
      if (state.review.promptOrigin === 'manual') {
        return {
          ...state,
          review: {
            ...state.review,
            prompt: 'dismissed',
            promptOrigin: null,
          },
        };
      }
      return {
        ...state,
        review: {
          ...state.review,
          prompt: state.review.automaticShowCount >= 3 ? 'stoppedAfterThree' : 'dismissed',
          promptOrigin: null,
        },
      };
    }
    case 'review/rate':
      return {
        ...state,
        review: {
          ...state.review,
          prompt: 'rated',
          promptOrigin: null,
          automaticSuppressedPermanently: true,
        },
      };
    case 'notification/open-preview':
      return {
        ...state,
        notification: { kind: action.kind, phase: 'unopened', destination: null },
      };
    case 'notification/tap': {
      const kind = state.notification.kind;
      if (!kind) return state;
      return {
        ...state,
        activeTab: kind === 'weeklyRecap' ? 'analysis' : 'home',
        notification: {
          kind,
          phase: 'tapped',
          destination: notificationDestinations[kind],
        },
      };
    }
    case 'notification/dismiss':
      return { ...state, notification: { kind: null, phase: 'idle', destination: null } };
    case 'debug/seed-showcase': {
      const showcase = createDemoState({ stage: 'home', showcase: true });
      return {
        ...showcase,
        analysis: showcaseAnalysisState(),
        nextConditionSequence: state.nextConditionSequence,
      };
    }
    case 'debug/clear-conditions':
      return {
        ...state,
        stage: 'home',
        conditions: [],
        analysis: {
          history: 'empty',
          presentationMode: 'natural',
          currentStreakDays: 0,
          activityCount: 0,
          activityLedger: [],
          streakDayKeys: [],
          timeLockedMinutes: 0,
          milestoneShelfSeen: true,
          newBadgeIds: [],
        },
        home: {
          mode: 'first-home-empty',
          remainingMinutes: 0,
          earnedMinutesToday: 0,
          screenTimeUsedMinutes: 45,
          balanceOnHold: false,
          accessHoliday: null,
          earnTransition: null,
        },
      };
    case 'debug/set-walk':
      return {
        ...state,
        sessions: {
          ...state.sessions,
          walk: action.phase,
          walkConditionId: action.phase === 'ready'
            ? null
            : state.sessions.walkConditionId
              ?? state.conditions.find((condition) => condition.catalogId === 'walk-state')?.id
              ?? null,
        },
      };
    case 'debug/set-gym':
      return {
        ...state,
        sessions: {
          ...state.sessions,
          gym: action.phase,
          gymConditionId: action.phase === 'ready'
            ? null
            : state.sessions.gymConditionId
              ?? state.conditions.find((condition) => condition.catalogId.startsWith('gym-'))?.id
              ?? null,
        },
      };
    case 'debug/set-account':
      return { ...state, account: { ...state.account, status: action.status } };
    case 'debug/set-permission-health':
      return { ...state, settings: { ...state.settings, permissionHealth: action.health } };
    case 'debug/set-subscription':
      return { ...state, settings: { ...state.settings, subscriptionStatus: action.status } };
    case 'debug/set-analysis':
      if (action.history === 'empty') {
        return {
          ...state,
          analysis: {
            history: 'empty',
            presentationMode: 'natural',
            currentStreakDays: 0,
            activityCount: 0,
            activityLedger: [],
            streakDayKeys: [],
            timeLockedMinutes: 0,
            milestoneShelfSeen: true,
            newBadgeIds: [],
          },
        };
      }
      return {
        ...state,
        analysis: showcaseAnalysisState(action.newBadgeId),
      };
    case 'debug/set-clock':
      return reconcileCurrentRuleAccess({
        ...state,
        clock: {
          dayKey: action.dayKey,
          minuteOfDay: Math.max(0, Math.min(1439, Math.floor(action.minuteOfDay))),
        },
      });
    case 'debug/set-review':
      return {
        ...state,
        review: {
          ...state.review,
          prompt: action.prompt,
          promptOrigin: action.prompt === 'presented' ? 'debug' : null,
          eligibleTrigger: action.trigger,
          automaticShowCount: action.automaticShowCount === undefined
            ? state.review.automaticShowCount
            : Math.max(0, Math.min(3, Math.floor(action.automaticShowCount))),
          automaticSuppressedPermanently:
            action.automaticSuppressedPermanently ?? state.review.automaticSuppressedPermanently,
          shieldSuppressionActive: action.prompt === 'suppressedAfterShield',
          shieldSuppressionRemainingMinutes: action.prompt === 'suppressedAfterShield' ? 18 : 0,
        },
      };
    case 'debug/reset':
      return createDemoState();
  }
}
