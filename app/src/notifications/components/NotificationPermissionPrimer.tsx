import { Modal, Text, View } from "react-native";

import { PillButton, Screen, useTheme } from "@/ui";

export function NotificationPermissionPrimer({
  visible,
  onAllow,
  onClose,
}: {
  visible: boolean;
  onAllow: () => void;
  onClose: () => void;
}) {
  const { spacing, typography } = useTheme();

  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      visible={visible}
      onRequestClose={onClose}
    >
      <Screen
        testID="notification-permission-primer"
        edges={["top", "left", "right", "bottom"]}
      >
        <View
          style={{
            flex: 1,
            gap: spacing.lg,
            justifyContent: "space-between",
            padding: spacing.gutter,
          }}
        >
          <View style={{ gap: spacing.md }}>
            <Text accessibilityRole="header" style={typography.sheetTitle}>
              Choose what helps
            </Text>
            <Text style={typography.body}>
              Turn on only the reminders that keep your screen-time payoff
              within reach.
            </Text>
          </View>
          <View style={{ gap: spacing.sm }}>
            <PillButton
              label="Allow notifications"
              variant="white"
              onPress={onAllow}
            />
            <PillButton
              label="Not now"
              variant="secondary"
              onPress={onClose}
            />
          </View>
        </View>
      </Screen>
    </Modal>
  );
}
