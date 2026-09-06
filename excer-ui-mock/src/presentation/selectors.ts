import { ONBOARDING_STEPS } from './fixtures';
import { conditionsHaveBankingConflict } from './builderRules';
import {
  formatMinutes,
  getCurrentRuleAccess,
  isCurrentRestDayAllowanceOnly,
} from './executionPolicy';
import { onboardingScreens } from '@/content/onboarding';
import type { BuilderStep, DemoState, HomeMode } from './types';

export function getOnboardingScreen(state: DemoState) {
  const step = state.onboarding.step;
  const copy = onboardingScreens.find((screen) => screen.route === `/onboarding/${step}`);
  if (!copy) throw new Error(`Missing canonical onboarding copy for ${step}`);
  const choiceReady =
    (step !== 'confession' || state.onboarding.phoneUseHours !== null) &&
    (step !== 'allowance' || state.onboarding.allowanceMinutes !== null) &&
    (step !== 'apps' || state.onboarding.selectedApps.length > 0);

  return {
    step,
    index: ONBOARDING_STEPS.indexOf(step),
    total: ONBOARDING_STEPS.length,
    id: copy.id,
    title: copy.title,
    body: 'body' in copy ? copy.body ?? '' : '',
    primaryLabel: 'primary' in copy ? copy.primary?.label ?? 'Continue' : 'Continue',
    canContinue: choiceReady,
  };
}

export function canContinueBuilder(state: DemoState): boolean {
  const { builder } = state;
  const enabledConflict = Boolean(
    builder.enabled
    && builder.catalogId
    && builder.kind
    && state.conditions.some((condition) =>
      condition.id !== builder.editingConditionId
      && condition.enabled
      && conditionsHaveBankingConflict({
        catalogId: builder.catalogId!,
        gymId: builder.gymId,
        kind: builder.kind,
      }, condition),
    ),
  );
  const activeWindowReady = builder.activeWindow === 'anytime'
    || (builder.activeWindow === 'start-only' && builder.activeWindowStartMinutes !== null)
    || (builder.activeWindow === 'end-only' && builder.activeWindowEndMinutes !== null)
    || ((builder.activeWindow === 'start-end' || builder.activeWindow === 'guided')
      && builder.activeWindowStartMinutes !== null
      && builder.activeWindowEndMinutes !== null);
  switch (builder.step) {
    case 'catalog':
      return builder.catalogGroup !== null;
    case 'method':
      return builder.catalogId !== null;
    case 'place':
      return builder.gymId !== null && state.savedGyms.some((gym) => gym.id === builder.gymId);
    case 'configure-event':
      return builder.catalogId === 'gym-arrive' || builder.eventThreshold !== null;
    case 'configure-state':
      return builder.stateGraceSeconds !== null;
    case 'configure-rate':
      return builder.rateMinutes !== null;
    case 'reward':
      return builder.reward !== null
        && (builder.reward === 'rest-of-day' || builder.rewardMinutes !== null);
    case 'daily-cap':
      return builder.dailyCap !== null;
    case 'cooldown':
      return builder.cooldownMinutes !== null;
    case 'repeatable':
      return builder.repeatable !== null;
    case 'active-window':
      return activeWindowReady;
    case 'banner':
      return builder.bannerId !== null;
    case 'preview':
      return builder.bannerId !== null
        && builder.name.trim().length > 0
        && !enabledConflict;
  }
}

const BUILDER_TITLES: Record<BuilderStep, string> = {
  catalog: 'Choose a way to earn',
  method: 'How should it count?',
  place: 'Choose a gym',
  'configure-event': 'Set the goal',
  'configure-state': 'Set the walking rule',
  'configure-rate': 'Set the exchange',
  reward: 'Choose the reward',
  'daily-cap': 'Completions per day',
  cooldown: 'Choose a cooldown',
  repeatable: 'Can it repeat?',
  'active-window': 'When is it active?',
  banner: 'Choose card artwork',
  preview: 'Preview your condition',
};

export function getBuilderScreen(state: DemoState) {
  const step = state.builder.step;
  return {
    step,
    title: state.builder.editingConditionId ? 'Edit condition' : BUILDER_TITLES[step],
    index: state.builder.path.indexOf(step),
    total: state.builder.path.length,
    canContinue: canContinueBuilder(state),
    primaryLabel: step === 'preview'
      ? state.builder.editingConditionId ? 'Done' : 'Save condition'
      : 'Next',
  };
}

const HOME_COPY: Record<
  HomeMode,
  { status: string; body: string; balanceOnHold: boolean }
> = {
  'first-home-empty': {
    status: 'Move first, scroll after.',
    body: 'Your 45 minutes are used. Add your first way to earn.',
    balanceOnHold: false,
  },
  locked: {
    status: 'Move first, scroll after.',
    body: 'Your sample balance is empty. Pick any available way to earn.',
    balanceOnHold: false,
  },
  unlocked: {
    status: '30 min ready',
    body: 'Use it when you want. Movement can add more.',
    balanceOnHold: false,
  },
  low: {
    status: '10 min left',
    body: 'A quick walk keeps your options open.',
    balanceOnHold: false,
  },
  unlimited: {
    status: 'No limit today',
    body: 'Your sample allowance is Unlimited.',
    balanceOnHold: false,
  },
  'rest-of-day': {
    status: 'Unlocked for today',
    body: 'Go to gym completed. Your sample balance is on hold until midnight.',
    balanceOnHold: true,
  },
  'set-period': {
    status: 'Unlocked until 8:30 PM',
    body: 'Distance goal completed. Your sample balance is on hold for this access period.',
    balanceOnHold: true,
  },
  'rest-day-no-locking': {
    status: 'No limits today',
    body: 'Sunday is a Rest day. Your sample balance is on hold until midnight.',
    balanceOnHold: true,
  },
  'outside-window': {
    status: 'Limits start at 7:00 PM',
    body: 'You’re outside the lock window. Your sample balance is on hold until then.',
    balanceOnHold: true,
  },
};

export function getHomeModel(state: DemoState) {
  const enabledConditionCount = state.conditions.filter((condition) => condition.enabled).length;
  const currentRuleMode = getCurrentRuleAccess(state)?.mode;
  const allowanceOnlyRestDay = isCurrentRestDayAllowanceOnly(state);
  const storedMode = currentRuleMode ?? state.home.mode;
  const mode = enabledConditionCount === 0 && storedMode === 'locked'
    ? 'first-home-empty'
    : storedMode;
  const copy = allowanceOnlyRestDay
    ? {
        status: state.home.remainingMinutes > 0
          ? `${formatMinutes(state.home.remainingMinutes)} of free time`
          : 'Daily allowance used',
        body: 'Today is a Rest day. Earning is paused; only your daily free allowance applies.',
        balanceOnHold: false,
      }
    : HOME_COPY[mode];
  return {
    mode,
    remainingMinutes: state.home.remainingMinutes,
    conditionCount: enabledConditionCount,
    timeLockedLabel: formatMinutes(state.analysis.timeLockedMinutes),
    ...copy,
  };
}
