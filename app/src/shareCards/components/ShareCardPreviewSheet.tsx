import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";

import { PillButton, Screen, useTheme } from "@/ui";

import type { RecapShareCardInput } from "../ShareCardInput";
import type { ShareCardRatio } from "../ShareCardFormat";
import { RecapShareCard } from "./RecapShareCard";

type ShareCardPreviewSheetProps = Readonly<{
  visible: boolean;
  input: RecapShareCardInput;
  onClose: () => void;
}>;

/** The local preview and 9:16/1:1 chooser; native handoff is a separate seam. */
export function ShareCardPreviewSheet({
  visible,
  input,
  onClose,
}: ShareCardPreviewSheetProps) {
  const { spacing, typography } = useTheme();
  const [ratio, setRatio] = useState<ShareCardRatio>("story");

  useEffect(() => {
    if (visible) setRatio("story");
  }, [visible]);

  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      visible={visible}
      onRequestClose={onClose}
    >
      <Screen
        edges={["top", "bottom", "left", "right"]}
        style={[styles.sheet, { gap: spacing.md, padding: spacing.gutter }]}
      >
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={[styles.header, { gap: spacing.md }]}>
            <Text accessibilityRole="header" style={typography.sheetTitle}>
              Share your week
            </Text>
            <PillButton
              label="Close"
              onPress={onClose}
              variant="secondary"
              style={styles.headerAction}
            />
          </View>

          <View style={[styles.previewWell, { marginVertical: spacing.md }]}>
            <View
              style={ratio === "story" ? styles.storyPreview : styles.feedPreview}
            >
              <RecapShareCard input={input} ratio={ratio} />
            </View>
          </View>

          <View style={[styles.controls, { gap: spacing.sm }]}>
            <PillButton
              label="Story · 9:16"
              onPress={() => setRatio("story")}
              variant={ratio === "story" ? "primary" : "secondary"}
              style={styles.ratioAction}
            />
            <PillButton
              label="Feed · 1:1"
              onPress={() => setRatio("feed")}
              variant={ratio === "feed" ? "primary" : "secondary"}
              style={styles.ratioAction}
            />
          </View>
        </View>
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: "row" },
  feedPreview: { aspectRatio: 1, width: "100%" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  headerAction: { alignSelf: "flex-end" },
  previewWell: { alignItems: "center", flex: 1, justifyContent: "center" },
  ratioAction: { flex: 1 },
  sheet: { flex: 1 },
  storyPreview: { aspectRatio: 9 / 16, height: "100%" },
});
