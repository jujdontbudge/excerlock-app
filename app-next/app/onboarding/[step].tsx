import { OnboardingRoute } from '../../src/packages/onboarding/OnboardingRoute';
import { ConditionBuilder } from '../../src/packages/editor/ConditionBuilder';
export default function OnboardingStepRoute() {
  return <OnboardingRoute stagingBuilder={(props) => <ConditionBuilder {...props} />} />;
}
