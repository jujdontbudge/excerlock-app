import { Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/ui";

type SettingsRowProps = {
  title: string;
  value?: string;
  description?: string;
  style?: StyleProp<ViewStyle>;
  valueTestID?: string;
};

/** A static settings fact or scaffold row. Interactive rows will wrap this later. */
export function SettingsRow({
  title,
  value,
  description,
  style,
  valueTestID,
}: SettingsRowProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[{ gap: spacing.xs }, style]}>
      <View style={[styles.heading, { gap: spacing.md }]}>
        <Text style={[typography.cardTitle, styles.title]}>{title}</Text>
        {value === undefined ? null : (
          <Text
            testID={valueTestID}
            style={[typography.body, { color: colors.textPrimary, textAlign: "right" }]}
          >
            {value}
          </Text>
        )}
      </View>
      {description === undefined ? null : (
        <Text style={typography.body}>{description}</Text>
      )}
    </View>
  );
}

const styles = {
  heading: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: { flex: 1 },
} as const;
