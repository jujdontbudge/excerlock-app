import { Redirect } from "expo-router";

import { OnboardingCompletionGate } from "@/onboarding";

export default function AppEntryRoute() {
  return (
    <OnboardingCompletionGate
      onboarding={<Redirect href="/(onboarding)" />}
      app={<Redirect href="/(tabs)" />}
    />
  );
}
