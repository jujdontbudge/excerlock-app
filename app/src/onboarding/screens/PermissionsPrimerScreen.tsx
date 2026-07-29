import { OnboardingScaffold } from "../components/OnboardingScaffold";
import type { OnboardingScreenProps } from "./ValuePropScreen";

/** Phase 2 copy only. TODO(Phase 3): authorize FamilyControls after this primer. */
export function PermissionsPrimerScreen({
  onContinue,
  onBack,
}: OnboardingScreenProps) {
  return (
    <OnboardingScaffold
      title="Screen Time keeps your choices honest"
      body="You'll choose which apps ExcerLock can pause. iOS keeps the list private."
      primaryLabel="Continue"
      onContinue={onContinue}
      onBack={onBack}
    />
  );
}
