import { useEffect } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { OnboardingScreen } from '@/features/onboarding';
import {
  ONBOARDING_STEPS,
  getOnboardingScreen,
  useDemo,
  type OnboardingStep,
} from '@/presentation';

function isOnboardingStep(value: string): value is OnboardingStep {
  return (ONBOARDING_STEPS as readonly string[]).includes(value);
}

export default function OnboardingRoute() {
  const { returnTo, step: rawStep } = useLocalSearchParams<{ returnTo?: string | string[]; step?: string | string[] }>();
  const router = useRouter();
  const { state, dispatch } = useDemo();
  const normalizedStep = Array.isArray(rawStep) ? rawStep[0] : rawStep;
  const normalizedReturnTo = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  const step = normalizedStep && isOnboardingStep(normalizedStep) ? normalizedStep : 'value';
  const screenState = state.onboarding.step === step
    ? state
    : { ...state, onboarding: { ...state.onboarding, step } };
  const model = getOnboardingScreen(screenState);

  useEffect(() => {
    if (state.onboarding.step !== step) {
      dispatch({ type: 'onboarding/set-step', step });
    }
  }, [dispatch, state.onboarding.step, step]);

  const navigateTo = (target: OnboardingStep, targetReturnTo?: 'review') => {
    dispatch({ type: 'onboarding/set-step', step: target });
    router.replace(`/onboarding/${target}${targetReturnTo ? '?returnTo=review' : ''}` as Href);
  };

  const onContinue = () => {
    if (step !== 'apps' && !model.canContinue) return;
    if (normalizedReturnTo === 'review' && ['apps', 'allowance', 'screen-time', 'motion', 'health', 'location'].includes(step)) {
      navigateTo('review');
      return;
    }
    const index = ONBOARDING_STEPS.indexOf(step);
    dispatch({ type: 'onboarding/continue' });
    if (index === ONBOARDING_STEPS.length - 1) {
      router.replace('/paywall');
      return;
    }
    router.replace(`/onboarding/${ONBOARDING_STEPS[index + 1]}` as Href);
  };

  const onBack = () => {
    if (normalizedReturnTo === 'review' && ['apps', 'allowance', 'screen-time', 'motion', 'health', 'location'].includes(step)) {
      navigateTo('review');
      return;
    }
    const index = ONBOARDING_STEPS.indexOf(step);
    if (index > 0) navigateTo(ONBOARDING_STEPS[index - 1]);
  };

  return (
    <OnboardingScreen
      allowanceMinutes={state.onboarding.allowanceMinutes}
      canContinue={model.canContinue}
      onBack={onBack}
      onCommitApps={(appIds) => dispatch({ type: 'onboarding/set-apps', appIds })}
      onContinue={onContinue}
      onJumpStep={(target) => navigateTo(target, 'review')}
      onSetAllowance={(minutes) => dispatch({ type: 'onboarding/set-allowance', minutes })}
      onSetPermission={(permission, value) => dispatch({ type: 'onboarding/set-permission', permission, value })}
      onSetPhoneUse={(hours) => dispatch({ type: 'onboarding/set-phone-use', hours })}
      permissionOutcomes={state.onboarding.permissionOutcomes}
      phoneUseHours={state.onboarding.phoneUseHours}
      selectedApps={state.onboarding.selectedApps}
      step={step}
    />
  );
}
