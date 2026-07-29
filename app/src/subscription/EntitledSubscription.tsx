import { Text, View } from "react-native";

import { PillButton, Screen, useTheme } from "@/ui";

type EntitledSubscriptionProps = {
  onContinue: () => void;
  onBack?: () => void;
};

export function EntitledSubscription({
  onContinue,
  onBack,
}: EntitledSubscriptionProps) {
  const { spacing, typography } = useTheme();

  return (
    <Screen edges={["top", "right", "bottom", "left"]}>
      <View
        style={{
          flex: 1,
          gap: spacing.lg,
          justifyContent: "center",
          padding: spacing.gutter,
        }}
      >
        <View style={{ alignItems: "center", gap: spacing.md }}>
          <Text
            accessibilityRole="header"
            style={[typography.screenTitle, { textAlign: "center" }]}
          >
            Your ExcerLock plan is active
          </Text>
          <Text style={[typography.body, { textAlign: "center" }]}>
            Premium access is unlocked.
          </Text>
        </View>
        <View style={{ gap: spacing.md }}>
          <PillButton
            label="Continue"
            onPress={onContinue}
            trailingIcon="arrowRight"
            variant="white"
          />
          {onBack === undefined ? null : (
            <PillButton label="Back" onPress={onBack} variant="secondary" />
          )}
        </View>
      </View>
    </Screen>
  );
}
