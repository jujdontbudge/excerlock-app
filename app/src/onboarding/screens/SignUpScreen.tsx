import { OnboardingScaffold } from "../components/OnboardingScaffold";
import type { OnboardingScreenProps } from "./ValuePropScreen";

/** Phase 2 scaffold. TODO(Phase 5): require Clerk sign-up before completing. */
export function SignUpScreen({
  onContinue,
  onBack,
}: OnboardingScreenProps) {
  return (
    <OnboardingScaffold
      title="Create your account"
      body="Save your plan and keep your progress available across devices."
      primaryLabel="Create account"
      onContinue={onContinue}
      onBack={onBack}
    />
  );
}
