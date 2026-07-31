import { useState } from "react";
import { Modal, Text, TextInput, View } from "react-native";

import { PillButton, Screen, useTheme } from "@/ui";

import type { SupportModule } from "../SupportModule";

export function SupportComposer({
  kind,
  support,
  visible,
  onClose,
}: {
  kind: "support" | "feature";
  support: SupportModule;
  visible: boolean;
  onClose: () => void;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFeature = kind === "feature";

  const close = () => {
    setTitle("");
    setMessage("");
    onClose();
  };
  const submit = async () => {
    const trimmedMessage = message.trim();
    const trimmedTitle = title.trim();
    if (
      trimmedMessage.length === 0 ||
      (isFeature && trimmedTitle.length === 0) ||
      isSubmitting
    ) {
      return;
    }
    setIsSubmitting(true);
    if (isFeature) {
      await support.submitFeatureRequest({
        title: trimmedTitle,
        message: trimmedMessage,
      });
    } else {
      await support.submitSupport({ message: trimmedMessage });
    }
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
              {isFeature ? "Request a feature" : "Contact support"}
            </Text>
            <Text style={typography.body}>
              {isFeature
                ? "Share the idea and vote for it after saving."
                : "Tell us what happened. Your request stays visible here if it cannot be sent."}
            </Text>
            {isFeature ? (
              <TextInput
                accessibilityLabel="Feature title"
                onChangeText={setTitle}
                placeholder="Feature title"
                placeholderTextColor={colors.textTertiary}
                style={[
                  typography.body,
                  {
                    backgroundColor: colors.cardElevated,
                    borderRadius: radius.md,
                    color: colors.textPrimary,
                    padding: spacing.md,
                  },
                ]}
                testID="support-composer-title-input"
                value={title}
              />
            ) : null}
            <TextInput
              accessibilityLabel={
                isFeature
                  ? "What would make ExcerLock better?"
                  : "How can we help?"
              }
              multiline
              onChangeText={setMessage}
              placeholder={
                isFeature
                  ? "What would make ExcerLock better?"
                  : "How can we help?"
              }
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
              testID="support-composer-message-input"
              value={message}
            />
          </View>
          <View style={{ gap: spacing.sm }}>
            <PillButton
              disabled={
                message.trim().length === 0 ||
                (isFeature && title.trim().length === 0) ||
                isSubmitting
              }
              label={
                isSubmitting
                  ? "Sending…"
                  : isFeature
                    ? "Submit feature request"
                    : "Send support request"
              }
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
