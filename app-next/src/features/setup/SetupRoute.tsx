import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { OnboardingShell } from '../onboarding/OnboardingShell';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { Activity } from '../../domain/types';
import { nextSetup, setupSteps, resumeSetup } from '../../onboarding/setupFlow';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { GymPickerScreen } from '../gym-picker/GymPickerScreen';
import { SignInScreen } from './SignInScreen';
import { useSignInRequiredSource } from './useSignInRequiredSource';
import { SetupComplete } from './SetupComplete';
import { setupCopy as c } from '../../content/setup';
export function SetupRoute() {
  const params = useLocalSearchParams<{ step?: string }>(),
    router = useRouter(),
    runtime = useRuntime(),
    signInRequired = useSignInRequiredSource(),
    state = useOnboardingStore((s) => s.data),
    rules = useRulesStore((s) => s.data.rules),
    [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const activity = (state.answers.activity ?? rules[0]?.activity ?? 'walking') as Activity,
    step = resumeSetup({ setupStep: params.step ?? state.setupStep, setupComplete: false }, activity);
  useEffect(() => {
    useOnboardingStore.getState().patch({ setupStep: step });
    runtime.analytics.screen(step);
    // A persisted step that no longer exists (X1, X2, walking X3) lands on the first real one.
    if (params.step !== step) router.setParams({ step });
  }, [step, runtime, params.step, router]);
  const advance = () => {
    Keyboard.dismiss();
    setDirection('forward');
    const next = nextSetup(step);
    useOnboardingStore.getState().patch({ setupStep: next, setupComplete: next === 'done', complete: true });
    if (next === 'done') router.replace('/(tabs)/home');
    else router.setParams({ step: next });
  };
  const back = () => {
    Keyboard.dismiss();
    setDirection('back');
    router.setParams({ step: setupSteps[Math.max(0, setupSteps.indexOf(step as (typeof setupSteps)[number]) - 1)] });
  };
  if (step === 'X3') return <GymPickerScreen onSaved={advance} />;
  let body = <SignInScreen onContinue={advance} signInRequired={signInRequired} />;
  if (step === 'X5') body = <SetupComplete activity={activity} />;
  return (
    <OnboardingShell
      step={step}
      progress={(setupSteps.indexOf(step as (typeof setupSteps)[number]) + 1) / setupSteps.length}
      direction={direction}
      onBack={back}
      hideBack={step === setupSteps[0] || (activity !== 'gym' && step === 'X4')}
      onContinue={advance}
      hideContinue={step !== 'X5'}
      continueLabel={c.home}>
      {body}
    </OnboardingShell>
  );
}
