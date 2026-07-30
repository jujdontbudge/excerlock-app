import { useEffect, useRef, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";

import { PillButton, Screen, useTheme } from "@/ui";

import type { RecapShareCardInput } from "../ShareCardInput";
import {
  SHARE_CARD_FORMATS,
  type ShareCardRatio,
} from "../ShareCardFormat";
import { getShareCardModule } from "../accessor";
import type {
  ShareCardHandoffResult,
  ShareCardModule,
} from "../ShareCardModule";
import { RecapShareCard } from "./RecapShareCard";

type ShareCardPreviewSheetProps = Readonly<{
  visible: boolean;
  input: RecapShareCardInput;
  shareCardModule?: ShareCardModule;
  onClose: () => void;
}>;

type HandoffStatus = "idle" | "working" | ShareCardHandoffResult["status"] | "failed";

/** The local preview and 9:16/1:1 chooser; native handoff is a separate seam. */
export function ShareCardPreviewSheet({
  visible,
  input,
  shareCardModule = getShareCardModule(),
  onClose,
}: ShareCardPreviewSheetProps) {
  const { spacing, typography } = useTheme();
  const [ratio, setRatio] = useState<ShareCardRatio>("story");
  const [handoffStatus, setHandoffStatus] = useState<HandoffStatus>("idle");
  const captureTargetRef = useRef<View>(null);

  useEffect(() => {
    if (visible) {
      setRatio("story");
      setHandoffStatus("idle");
    }
  }, [visible]);

  const shareCard = async () => {
    setHandoffStatus("working");
    try {
      const captured = await shareCardModule.captureCard({
        target: captureTargetRef,
        template: "recap",
        ratio,
      });
      const result = await shareCardModule.presentShareSheet(captured);
      setHandoffStatus(result.status);
    } catch {
      setHandoffStatus("failed");
    }
  };

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
              style={[
                ratio === "story" ? styles.storyPreview : styles.feedPreview,
                { aspectRatio: SHARE_CARD_FORMATS[ratio].aspectRatio },
              ]}
            >
              <RecapShareCard
                captureTargetRef={captureTargetRef}
                input={input}
                ratio={ratio}
              />
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

          <View style={{ gap: spacing.sm }}>
            <PillButton
              label={handoffStatus === "working" ? "Preparing card…" : "Share card"}
              disabled={handoffStatus === "working"}
              onPress={() => void shareCard()}
              variant="white"
            />
            {handoffStatus === "simulated" ? (
              <Text style={typography.caption}>
                Prepared with the local share mock.
              </Text>
            ) : null}
            {handoffStatus === "failed" ? (
              <Text style={typography.caption}>
                The card could not be prepared. Try again.
              </Text>
            ) : null}
          </View>
        </View>
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: "row" },
  feedPreview: { width: "100%" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  headerAction: { alignSelf: "flex-end" },
  previewWell: { alignItems: "center", flex: 1, justifyContent: "center" },
  ratioAction: { flex: 1 },
  sheet: { flex: 1 },
  storyPreview: { height: "100%" },
});
