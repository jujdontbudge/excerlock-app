import type { RefObject } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/ui";

import type { RecapShareCardInput } from "../ShareCardInput";
import type { ShareCardRatio } from "../ShareCardFormat";
import { ShareCardFrame } from "./ShareCardFrame";

type RecapShareCardProps = Readonly<{
  input: RecapShareCardInput;
  ratio: ShareCardRatio;
  captureTargetRef?: RefObject<View | null>;
}>;

export function RecapShareCard({
  input,
  ratio,
  captureTargetRef,
}: RecapShareCardProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <ShareCardFrame ref={captureTargetRef} ratio={ratio}>
      <Text style={typography.caption}>{input.weekDateRange}</Text>

      <View style={[styles.hero, { gap: spacing.sm }]}>
        <Text style={typography.caption}>TIME RECLAIMED</Text>
        <Text
          testID="share-reclaimed"
          style={[typography.hero, { color: colors.primary }]}
        >
          {formatMinutes(input.reclaimedMinutes)}
        </Text>
      </View>

      <View style={[styles.facts, { gap: spacing.md }]}>
        <Text testID="share-active-days" style={typography.numeric}>
          {input.activeDays} of {input.scheduledActiveDays} active days
        </Text>
        <Text testID="share-earn-count" style={typography.numeric}>
          {input.earnCount} {input.earnCount === 1 ? "earn" : "earns"}
        </Text>
      </View>

      <Text style={[typography.cardTitle, styles.wordmark]}>ExcerLock</Text>
    </ShareCardFrame>
  );
}

function formatMinutes(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes));
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

const styles = StyleSheet.create({
  facts: { alignItems: "center" },
  hero: { alignItems: "center", flex: 1, justifyContent: "center" },
  wordmark: { textAlign: "center" },
});
