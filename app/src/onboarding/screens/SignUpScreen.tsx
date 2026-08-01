import { AccountOnboarding } from "@/account";

import type { OnboardingScreenProps } from "./ValuePropScreen";

/** The rail supplies navigation; account owns auth state and intents. */
export function SignUpScreen({
  account,
  onContinue,
  onBack,
}: OnboardingScreenProps) {
  return (
    <AccountOnboarding
      account={account}
      onAuthenticated={onContinue}
      onBack={onBack}
    />
  );
}
