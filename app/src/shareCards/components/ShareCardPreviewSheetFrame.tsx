import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Modal, StyleSheet, Text, View } from "react-native";

import { PillButton, Screen, useTheme } from "@/ui";

import {
  SHARE_CARD_FORMATS,
  type ShareCardRatio,
} from "../ShareCardFormat";
import { getShareCardModule } from "../accessor";
import type {
  ShareCardHandoffResult,
  ShareCardModule,
  ShareCardTemplate,
} from "../ShareCardModule";

type ShareCardPreviewSheetFrameProps = Readonly<{
  visible: boolean;
  title: string;
  template: ShareCardTemplate;
  shareCardModule?: ShareCardModule;
  onClose: () => void;
  renderCard: (
    ratio: ShareCardRatio,
    captureTargetRef: RefObject<View | null>,
  ) => ReactNode;
}>;

type HandoffStatus =
  | "idle"
  | "working"
  | ShareCardHandoffResult["status"]
  | "failed";

/**
 * Shared preview mechanics for both privacy-safe card templates. Template
 * wrappers keep their narrow inputs separate and supply only rendered content.
 */
export function ShareCardPreviewSheetFrame({
  visible,
  title,
  template,
  shareCardModule = getShareCardModule(),
  onClose,
  renderCard,
}: ShareCardPreviewSheetFrameProps) {
  const { spacing, typography } = useTheme();
  const [ratio, setRatio] = useState<ShareCardRatio>("story");
  const [handoffStatus, setHandoffStatus] =
    useState<HandoffStatus>("idle");
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
        template,
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
              {title}
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
              {renderCard(ratio, captureTargetRef)}
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
              label={
                handoffStatus === "working"
                  ? "Preparing card…"
                  : "Share card"
              }
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
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerAction: { alignSelf: "flex-end" },
  previewWell: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  ratioAction: { flex: 1 },
  sheet: { flex: 1 },
  storyPreview: { height: "100%" },
});
