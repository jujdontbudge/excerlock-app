import { OnboardingShell } from './OnboardingShell';
import { useOnboarding } from './useOnboarding';
import { canContinue } from '../../onboarding/validation';
import { PreBranchScreen } from './PreBranchScreen';
export function OnboardingRoute() {
  const flow = useOnboarding();
  return (
    <OnboardingShell
      step={flow.step}
      progress={flow.progress}
      direction={flow.direction}
      onBack={flow.back}
      onContinue={flow.advance}
      valid={canContinue(flow.step, flow.answers)}>
      <PreBranchScreen {...flow} />
    </OnboardingShell>
  );
}
