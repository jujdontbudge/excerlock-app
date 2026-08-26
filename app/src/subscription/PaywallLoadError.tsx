import { Text, View } from "react-native";

import { PillButton, Screen, useTheme } from "@/ui";

type PaywallLoadErrorProps = {
  message: string;
  onRetry: () => Promise<void>;
  onBack?: () => void;
  /**
   * Escape hatch for a caller whose flow cannot end here. Onboarding supplies
   * it because a keyless or offline build errors on every load, and a step that
   * can never succeed would otherwise trap the user before completion.
   */
  onContinueWithoutPlan?: () => void;
};

export function PaywallLoadError({
  message,
  onRetry,
  onBack,
  onContinueWithoutPlan,
}: PaywallLoadErrorProps) {
  const { colors, spacing, typography } = useTheme();

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
            Plans couldn't load
          </Text>
          <Text
            accessibilityLabel={message}
            accessibilityRole="alert"
            style={[
              typography.body,
              { color: colors.danger, textAlign: "center" },
            ]}
          >
            {message}
          </Text>
        </View>
        <View style={{ gap: spacing.md }}>
          <PillButton
            label="Try again"
            onPress={onRetry}
            variant="white"
          />
          {onContinueWithoutPlan === undefined ? null : (
            <PillButton
              label="Continue without a plan"
              onPress={onContinueWithoutPlan}
              variant="secondary"
            />
          )}
          {onBack === undefined ? null : (
            <PillButton label="Back" onPress={onBack} variant="secondary" />
          )}
        </View>
      </View>
    </Screen>
  );
}
