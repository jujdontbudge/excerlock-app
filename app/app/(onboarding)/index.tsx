import { router } from "expo-router";

import { OnboardingFlow } from "@/onboarding";

export default function OnboardingRoute() {
  return <OnboardingFlow onComplete={() => router.replace("/(tabs)")} />;
}
