import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Card, useTheme } from "@/ui";

/**
 * The frame every condition card shares: title, its source, and a status badge.
 *
 * PRD §3.15 gives each condition a full-bleed banner behind this layer. The
 * 21-banner library is still owed (`design/STYLE.md` Family C), so the card
 * currently wears the translucent card fill and keeps the overlay geometry the
 * banner will need.
 */
export function CardShell({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  badge?: ReactNode;
  children?: ReactNode;
}) {
  const { spacing, typography } = useTheme();

  return (
    <Card testID="condition-card" variant="elevated" style={{ gap: spacing.md }}>
      <View style={styles.header}>
        <View style={{ flexShrink: 1, gap: spacing.xs }}>
          <Text style={typography.cardTitle}>{title}</Text>
          <Text style={typography.caption}>{subtitle}</Text>
        </View>
        {badge}
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
});
