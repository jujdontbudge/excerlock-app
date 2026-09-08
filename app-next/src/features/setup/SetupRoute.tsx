import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { OnboardingShell } from '../onboarding/OnboardingShell';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { Activity } from '../../domain/types';
import { branchPermission, nextSetup, previousSetup, setupPath, resumeSetup, SetupStep } from '../../onboarding/setupFlow';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { PermissionPrimer } from './PermissionPrimer';
import { AppsSetup } from './AppsSetup';
import { GymPickerScreen } from '../gym-picker/GymPickerScreen';
import { SignInScreen } from './SignInScreen';
import { SetupComplete, SetupFix } from './SetupComplete';
import { setupCopy as c } from '../../content/setup';
import { SecondaryButton } from '../../design-system';
export function SetupRoute() {
  const params = useLocalSearchParams<{ step?: string }>(),
    router = useRouter(),
    runtime = useRuntime(),
    state = useOnboardingStore((s) => s.data),
    rules = useRulesStore((s) => s.data.rules),
    [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const activity = (state.answers.activity ?? rules[0]?.activity ?? 'walking') as Activity,
    step = resumeSetup({ setupStep: params.step ?? state.setupStep, setupComplete: false }, activity),
    path = setupPath(activity);
  useEffect(() => {
    useOnboardingStore.getState().patch({ setupStep: step });
    runtime.analytics.screen(step);
  }, [step, runtime]);
  const advance = () => {
    Keyboard.dismiss();
    setDirection('forward');
    const next = nextSetup(step, activity);
    useOnboardingStore.getState().patch({ setupStep: next, setupComplete: next === 'done', complete: true });
    if (next === 'done') router.replace('/(tabs)/home');
    else router.setParams({ step: next });
  };
  const back = () => {
    Keyboard.dismiss();
    setDirection('back');
    router.setParams({ step: previousSetup(step, activity) });
  };
  const fix = (target: SetupFix) => {
    setDirection('back');
    if (target === 'notifications') router.push('/settings/permission/notifications');
    else router.setParams({ step: target });
  };
  let body = <PermissionPrimer name="screenTime" onContinue={advance} />;
  if (step === 'X2') body = <AppsSetup onContinue={advance} />;
  if (step === 'X3a')
    body = (
      <>
        <GymPickerScreen embedded onSaved={advance} />
        <SecondaryButton label={c.skip} variant="tertiary" onPress={advance} />
      </>
    );
  if (step === 'X3b') body = <PermissionPrimer name={branchPermission(activity)} onContinue={advance} />;
  if (step === 'X4') body = <SignInScreen onContinue={advance} />;
  if (step === 'X5') body = <SetupComplete activity={activity} onFix={fix} />;
  return (
    <OnboardingShell
      step={step}
      progress={(path.indexOf(step as SetupStep) + 1) / path.length}
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
