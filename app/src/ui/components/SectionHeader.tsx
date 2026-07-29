import { Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../theme";

type SectionHeaderProps = {
  title: string;
  /** One quiet line under the label — often the group's empty-state hint. */
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
};

/** The 13pt uppercase label that heads a group of rows or cards. */
export function SectionHeader({ title, subtitle, style }: SectionHeaderProps) {
  const { spacing, typography } = useTheme();

  return (
    <View style={[{ gap: spacing.xs }, style]}>
      <Text accessibilityRole="header" style={[typography.caption, { textTransform: "uppercase", letterSpacing: 0.6 }]}>
        {title}
      </Text>
      {subtitle === undefined ? null : <Text style={typography.body}>{subtitle}</Text>}
    </View>
  );
}
