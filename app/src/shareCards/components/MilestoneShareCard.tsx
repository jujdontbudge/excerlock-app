import type { ReactElement } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/ui";

import type { MilestoneShareCardInput } from "../ShareCardInput";
import type { ShareCardRatio } from "../ShareCardFormat";
import { ShareCardFrame } from "./ShareCardFrame";

type MilestoneShareCardProps = Readonly<{
  input: MilestoneShareCardInput;
  ratio: ShareCardRatio;
  /** Badge ticket #74 supplies this art; this renderer never invents it. */
  badgeArt: ReactElement;
}>;

export function MilestoneShareCard({
  input,
  ratio,
  badgeArt,
}: MilestoneShareCardProps) {
  const { spacing, typography } = useTheme();

  return (
    <ShareCardFrame ratio={ratio}>
      <View style={[styles.hero, { gap: spacing.sm }]}>
        <View style={styles.badge}>{badgeArt}</View>
        <Text style={typography.hero}>{input.achievementNumber}</Text>
        <Text style={typography.title}>{input.milestoneName}</Text>
      </View>

      <View style={[styles.footer, { gap: spacing.md }]}>
        <Text style={typography.body}>{input.unlockMonth}</Text>
        <Text style={typography.cardTitle}>ExcerLock</Text>
      </View>
    </ShareCardFrame>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", flex: 1, justifyContent: "center", width: "100%" },
  footer: { alignItems: "center" },
  hero: { alignItems: "center", flex: 1, justifyContent: "center" },
});
