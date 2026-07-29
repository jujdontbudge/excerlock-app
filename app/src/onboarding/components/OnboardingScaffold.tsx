import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { PillButton, Screen, useTheme } from "@/ui";

type OnboardingScaffoldProps = {
  title: string;
  body: string;
  children?: ReactNode;
  content?: ReactNode;
  primaryLabel: string;
  onContinue: () => void;
  onBack?: () => void;
};

/** Shared Phase-2 chrome; each rail screen supplies only its own content. */
export function OnboardingScaffold({
  title,
  body,
  children,
  content,
  primaryLabel,
  onContinue,
  onBack,
}: OnboardingScaffoldProps) {
  const { spacing, typography } = useTheme();

  return (
    <Screen edges={["top", "right", "bottom", "left"]}>
      <View
        style={{
          flex: 1,
          justifyContent: "space-between",
          padding: spacing.gutter,
        }}
      >
        <View
          style={{
            alignItems: "center",
            flex: 1,
            gap: spacing.lg,
            justifyContent: "center",
          }}
        >
          {children}
          <Text
            accessibilityRole="header"
            style={[typography.screenTitle, { textAlign: "center" }]}
          >
            {title}
          </Text>
          <Text style={[typography.body, { textAlign: "center" }]}>{body}</Text>
          {content}
        </View>

        <View style={{ gap: spacing.md }}>
          <PillButton
            label={primaryLabel}
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
