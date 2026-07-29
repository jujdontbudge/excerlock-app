import { PERMISSION_COPY } from "@/lock";

import { OnboardingScaffold } from "../components/OnboardingScaffold";
import type { OnboardingScreenProps } from "./ValuePropScreen";

/**
 * The primer explains the permission the lock surface also explains, so the
 * words come from `@/lock`'s `PERMISSION_COPY` (#49) rather than from a second
 * set of literals here. `notDetermined` is this step by definition: onboarding
 * primes *before* asking, and the ask itself is Phase 3's.
 *
 * TODO(Phase 3): authorize FamilyControls after this primer.
 */
export function PermissionsPrimerScreen({
  onContinue,
  onBack,
}: OnboardingScreenProps) {
  const { title, body } = PERMISSION_COPY.notDetermined;

  return (
    <OnboardingScaffold
      title={title}
      body={body}
      primaryLabel="Continue"
      onContinue={onContinue}
      onBack={onBack}
    />
  );
}
