import { AccountOnboarding } from "@/account";

import type { OnboardingScreenProps } from "./ValuePropScreen";

/** The rail supplies navigation; account owns auth state and intents. */
export function SignUpScreen({
  onContinue,
  onBack,
}: OnboardingScreenProps) {
  return (
    <AccountOnboarding
      onAuthenticated={onContinue}
      onBack={onBack}
    />
  );
}
