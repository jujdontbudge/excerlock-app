import {
  useEffect,
  useSyncExternalStore,
  type ComponentType,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

import { PillButton, Screen, useTheme } from "@/ui";

import type { TreadmillScanSnapshot } from "./TreadmillScanController";

export interface TreadmillScanSource {
  getSnapshot(): TreadmillScanSnapshot;
  subscribe(listener: () => void): () => void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export type GaitPreviewComponent = ComponentType<{
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function TreadmillScanScreen({
  source,
  Preview,
  onContinueHandheld,
}: {
  source: TreadmillScanSource;
  Preview: GaitPreviewComponent;
  onContinueHandheld: () => void;
}) {
  const snapshot = useSyncExternalStore(
    (listener) => source.subscribe(listener),
    () => source.getSnapshot(),
  );
  const { colors, radius, spacing, typography } = useTheme();

  useEffect(() => {
    void source.start();
    return () => {
      void source.stop();
    };
  }, [source]);

  if (snapshot.phase === "permissionDenied") {
    return (
      <Screen edges={["top", "bottom", "left", "right"]}>
        <View
          style={[
            styles.permission,
            { gap: spacing.lg, padding: spacing.gutter },
          ]}
        >
          <View style={{ gap: spacing.sm }}>
            <Text accessibilityRole="header" style={typography.title}>
              Camera access is off
            </Text>
            <Text style={typography.body}>
              Keep your phone with you. Walk &amp; Scroll will verify your steps
              instead.
            </Text>
          </View>
          <PillButton
            label="Continue with phone in hand"
            onPress={onContinueHandheld}
            variant="white"
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={["top", "bottom", "left", "right"]}>
      <View
        style={[
          styles.content,
          { gap: spacing.md, padding: spacing.gutter },
        ]}
      >
        <View style={{ gap: spacing.sm }}>
          <Text accessibilityRole="header" style={typography.title}>
            Prop your phone and walk
          </Text>
          <Text style={typography.body}>
            Set it upright in front of you. Angle the camera until your
            shoulders and hips fit in frame.
          </Text>
        </View>

        <View
          style={[
            styles.previewFrame,
            {
              backgroundColor: colors.bgNight,
              borderRadius: radius.xl,
            },
          ]}
        >
          <Preview active style={StyleSheet.absoluteFill} />
          <View
            pointerEvents="none"
            style={[styles.previewShade, { borderRadius: radius.xl }]}
          />
          <View
            style={[
              styles.progress,
              {
                backgroundColor: colors.bgDetail,
                borderRadius: radius.pill,
              },
            ]}
          >
            <ScanProgressRing confidence={snapshot.confidence} />
          </View>
          {snapshot.phase === "needsFraming" ? (
            <View
              style={[
                styles.failure,
                {
                  backgroundColor: colors.bgNight,
                  borderRadius: radius.md,
                  padding: spacing.md,
                },
              ]}
            >
              <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                Can&apos;t see you — step into frame
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          Processed on this iPhone. Nothing is recorded or sent.
        </Text>
      </View>
    </Screen>
  );
}

function ScanProgressRing({ confidence }: { confidence: number }) {
  const { colors } = useTheme();
  const percent = Math.round(Math.max(0, Math.min(1, confidence)) * 100);
  const radius = 22;
  const circumference = 2 * Math.PI * radius;

  return (
    <View
      accessible
      accessibilityLabel="Walking scan progress"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={styles.ring}
    >
      <Svg height={56} width={56}>
        <Circle
          cx={28}
          cy={28}
          r={radius}
          fill="transparent"
          stroke={colors.textTertiary}
          strokeWidth={5}
        />
        <Circle
          cx={28}
          cy={28}
          r={radius}
          fill="transparent"
          rotation={-90}
          origin="28, 28"
          stroke={colors.primary}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - percent / 100)}
          strokeLinecap="round"
          strokeWidth={5}
        />
      </Svg>
      <Text style={[styles.percent, { color: colors.textPrimary }]}>
        {percent}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  failure: {
    bottom: 16,
    left: 16,
    position: "absolute",
    right: 88,
  },
  percent: {
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    position: "absolute",
  },
  permission: { flex: 1, justifyContent: "center" },
  previewFrame: { flex: 1, minHeight: 320, overflow: "hidden" },
  previewShade: {
    backgroundColor: "rgba(18, 12, 5, 0.08)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  progress: { padding: 4, position: "absolute", right: 16, top: 16 },
  ring: { alignItems: "center", height: 56, justifyContent: "center", width: 56 },
});
