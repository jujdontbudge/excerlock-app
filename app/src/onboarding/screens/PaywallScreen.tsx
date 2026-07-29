import { Text, View } from "react-native";

import { Card, useTheme } from "@/ui";

import { OnboardingScaffold } from "../components/OnboardingScaffold";
import type { OnboardingScreenProps } from "./ValuePropScreen";

/** Phase 2 scaffold. TODO(Phase 5): render and purchase the remote Adapty placement. */
export function PaywallScreen({
  onContinue,
  onBack,
}: OnboardingScreenProps) {
  const { spacing, typography } = useTheme();

  return (
    <OnboardingScaffold
      title="Unlock the full ExcerLock plan"
      body="Choose the plan that helps you turn intention into a daily habit."
      content={
        <Card style={{ alignSelf: "stretch" }}>
          <View style={{ gap: spacing.sm }}>
            <Text style={typography.cardTitle}>Annual and monthly plans</Text>
            <Text style={typography.body}>
              Trial available on the annual plan
            </Text>
          </View>
        </Card>
      }
      primaryLabel="Start free trial"
      onContinue={onContinue}
      onBack={onBack}
    />
  );
}
