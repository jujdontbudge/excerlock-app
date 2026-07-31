import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import { Card, useTheme } from "@/ui";
import { bannerSource, type BannerSelection } from "../../banners/bannerCatalog";

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
  banner,
}: {
  title: string;
  subtitle: string;
  badge?: ReactNode;
  children?: ReactNode;
  banner: BannerSelection;
}) {
  const { colors, spacing, typography } = useTheme();

  return (
    <Card
      testID="condition-card"
      variant="elevated"
      style={{ backgroundColor: "transparent", gap: spacing.md }}
    >
      <Image
        accessible
        accessibilityLabel={`${banner.kind === "photo" ? "Custom photo" : "Painted"} banner for ${title}`}
        source={bannerSource(banner)}
        contentFit="cover"
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(18, 12, 5, 0.18)", "rgba(18, 12, 5, 0.94)"]}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <View style={{ flexShrink: 1, gap: spacing.xs }}>
          <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{subtitle}</Text>
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
