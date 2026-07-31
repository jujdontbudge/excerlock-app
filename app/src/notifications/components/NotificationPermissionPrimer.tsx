import { Modal, StyleSheet, Text, View } from "react-native";

import { DismissalBlur, PillButton, Screen, useTheme } from "@/ui";

export function NotificationPermissionPrimer({
  visible,
  onAllow,
  onClose,
}: {
  visible: boolean;
  onAllow: () => void;
  onClose: () => void;
}) {
  const { radius, spacing, typography } = useTheme();

  return (
    <Modal
      animationType="fade"
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modal}>
        <DismissalBlur
          accessibilityLabel="Dismiss notification primer"
          onDismiss={onClose}
        />
        <View
          style={[
            styles.sheet,
            {
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
            },
          ]}
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: "flex-end" },
  sheet: { height: "70%", overflow: "hidden" },
});
