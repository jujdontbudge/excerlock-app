import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { OnboardingShell } from '../onboarding/OnboardingShell';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { Activity } from '../../domain/types';
import { branchPermission, nextSetup, setupSteps, resumeSetup } from '../../onboarding/setupFlow';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { PermissionPrimer } from './PermissionPrimer';
import { AppsSetup } from './AppsSetup';
import { GymPickerScreen } from '../gym-picker/GymPickerScreen';
import { SignInScreen } from './SignInScreen';
import { SetupComplete } from './SetupComplete';
import { setupCopy as c } from '../../content/setup';
export function SetupRoute() {
  const params = useLocalSearchParams<{ step?: string }>(),
    router = useRouter(),
    runtime = useRuntime(),
    state = useOnboardingStore((s) => s.data),
    rules = useRulesStore((s) => s.data.rules),
    [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const step = resumeSetup({ setupStep: params.step ?? state.setupStep, setupComplete: false }),
    activity = (state.answers.activity ?? rules[0]?.activity ?? 'walking') as Activity;
  useEffect(() => {
    useOnboardingStore.getState().patch({ setupStep: step });
    runtime.analytics.screen(step);
  }, [step, runtime]);
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
  let body = <PermissionPrimer name="screenTime" onContinue={advance} />;
  if (step === 'X2') body = <AppsSetup onContinue={advance} />;
  if (step === 'X3' && activity === 'gym') return <GymPickerScreen onSaved={advance} />;
  if (step === 'X3') body = <PermissionPrimer name={branchPermission(activity)} onContinue={advance} />;
  if (step === 'X4') body = <SignInScreen onContinue={advance} />;
  if (step === 'X5') body = <SetupComplete activity={activity} />;
  return (
    <OnboardingShell
      step={step}
      progress={(setupSteps.indexOf(step as (typeof setupSteps)[number]) + 1) / setupSteps.length}
      direction={direction}
      onBack={back}
      hideBack={step === 'X1'}
      onContinue={advance}
      hideContinue={step !== 'X5'}
      continueLabel={c.home}>
      {body}
    </OnboardingShell>
  );
}
