import { useState } from "react";
import { Modal, Text, TextInput, View } from "react-native";

import { PillButton, Screen, useTheme } from "@/ui";

import type { SupportModule } from "../SupportModule";

export function SupportComposer({
  support,
  visible,
  onClose,
}: {
  support: SupportModule;
  visible: boolean;
  onClose: () => void;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const close = () => {
    setMessage("");
    onClose();
  };
  const submit = async () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0 || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    await support.submitSupport({ message: trimmedMessage });
    setIsSubmitting(false);
    close();
  };

  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      visible={visible}
      onRequestClose={close}
    >
      <Screen
        testID="support-composer"
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
            <Text accessibilityRole="header" style={typography.title}>
              Contact support
            </Text>
            <Text style={typography.body}>
              Tell us what happened. Your request stays visible here if it
              cannot be sent.
            </Text>
            <TextInput
              accessibilityLabel="How can we help?"
              multiline
              onChangeText={setMessage}
              placeholder="How can we help?"
              placeholderTextColor={colors.textTertiary}
              style={[
                typography.body,
                {
                  backgroundColor: colors.cardElevated,
                  borderRadius: radius.md,
                  color: colors.textPrimary,
                  minHeight: 160,
                  padding: spacing.md,
                  textAlignVertical: "top",
                },
              ]}
              value={message}
            />
          </View>
          <View style={{ gap: spacing.sm }}>
            <PillButton
              disabled={message.trim().length === 0 || isSubmitting}
              label={isSubmitting ? "Sending…" : "Send support request"}
              onPress={() => void submit()}
              variant="white"
            />
            <PillButton
              disabled={isSubmitting}
              label="Cancel"
              onPress={close}
              variant="secondary"
            />
          </View>
        </View>
      </Screen>
    </Modal>
  );
}
