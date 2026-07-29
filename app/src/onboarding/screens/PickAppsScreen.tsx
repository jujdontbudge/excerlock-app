import { OnboardingScaffold } from "../components/OnboardingScaffold";
import type { OnboardingScreenProps } from "./ValuePropScreen";

/** Phase 2 scaffold. TODO(Phase 3): present and persist FamilyActivityPicker. */
export function PickAppsScreen({
  onContinue,
  onBack,
}: OnboardingScreenProps) {
  return (
    <OnboardingScaffold
      title="Pick the apps that can wait"
      body="Choose distracting apps now. Phone and emergency access always stay available."
      primaryLabel="Choose apps"
      onContinue={onContinue}
      onBack={onBack}
    />
  );
}
