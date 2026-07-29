import { SubscriptionPaywall } from "@/subscription";

import { useConfessionStore } from "../store/confessionStore";
import type { OnboardingScreenProps } from "./ValuePropScreen";

/** The onboarding rail supplies navigation and confession; subscription owns the surface. */
export function PaywallScreen({
  onContinue,
  onBack,
}: OnboardingScreenProps) {
  const confessedDailyMinutes = useConfessionStore(
    (state) => state.confessedDailyMinutes,
  );

  return (
    <SubscriptionPaywall
      placement="onboarding"
      confessedDailyMinutes={confessedDailyMinutes}
      onEntitled={onContinue}
      onBack={onBack}
    />
  );
}
