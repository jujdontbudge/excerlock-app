import type { CatalogId } from "@excerlock/condition-model";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SectionHeader, useTheme } from "@/ui";

import {
  curatedBannersForCatalog,
  type BannerSelection,
} from "../../banners/bannerCatalog";
import type { BannerPhotoPicker } from "../../banners/bannerPhotoPicker";

export function BannerStep({
  catalogId,
  selection,
  photoPicker,
  onSelect,
}: {
  catalogId: CatalogId;
  selection?: BannerSelection;
  photoPicker: BannerPhotoPicker;
  onSelect: (selection: BannerSelection) => void;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const pickPhoto = async () => {
    const result = await photoPicker.pick();
    if (result.status === "selected") onSelect({ kind: "photo", uri: result.uri });
  };

  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader
        title="Choose its banner"
        subtitle="Pick a painted banner or crop one of your own photos. It stays on this device."
      />
      <View style={{ gap: spacing.sm }}>
        {curatedBannersForCatalog(catalogId).map((banner) => {
          const selected = selection?.kind === "curated" && selection.id === banner.id;
          return (
            <Pressable
              key={banner.id}
              accessibilityRole="button"
              accessibilityLabel={banner.label}
              accessibilityState={{ selected }}
              onPress={() => onSelect({ kind: "curated", id: banner.id })}
              style={[styles.option, { borderRadius: radius.lg }]}
            >
              <Image source={banner.source} contentFit="cover" style={StyleSheet.absoluteFill} />
              <View style={[styles.label, { backgroundColor: "rgba(18, 12, 5, 0.82)", padding: spacing.sm }]}>
                <Text style={[typography.cardTitle, { color: colors.onPrimary }]}>
                  {selected ? `✓ ${banner.label}` : banner.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use your own photo"
          accessibilityState={{ selected: selection?.kind === "photo" }}
          onPress={() => void pickPhoto()}
          style={[
            styles.photo,
            {
              backgroundColor: colors.cardElevated,
              borderRadius: radius.lg,
              padding: spacing.md,
            },
          ]}
        >
          <Text style={typography.cardTitle}>
            {selection?.kind === "photo" ? "✓ Own photo selected" : "Use your own photo"}
          </Text>
          <Text style={typography.caption}>Choose from Photos and crop it for the card.</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { bottom: 0, left: 0, position: "absolute", right: 0 },
  option: { height: 112, overflow: "hidden" },
  photo: { gap: 4 },
});
