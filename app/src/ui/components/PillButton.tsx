import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { Glyph, type GlyphName } from "../icons";
import { useTheme } from "../theme";

type PillVariant = "primary" | "white" | "secondary";

type PillButtonProps = {
  label: string;
  onPress?: () => void;
  /** `white` is the big screen-level action; `secondary` is the quiet one. */
  variant?: PillVariant;
  /** Suffix glyph — `arrowRight` on continue-style calls to action. */
  trailingIcon?: GlyphName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const PRESSED_SCALE = 0.96;

export function PillButton({
  label,
  onPress,
  variant = "primary",
  trailingIcon,
  disabled = false,
  style,
  testID,
}: PillButtonProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const springTo = (toValue: number) => {
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  };

  const fill = {
    primary: colors.primary,
    white: colors.pillScreenCta,
    secondary: colors.pillSecondary,
  }[variant];
  const ink = variant === "white" ? colors.onPillScreenCta : colors.onPrimary;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => springTo(PRESSED_SCALE)}
      onPressOut={() => springTo(1)}
      style={[
        styles.pill,
        {
          backgroundColor: fill,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.lg,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Animated.View style={[styles.content, { gap: spacing.sm, transform: [{ scale }] }]}>
        <Text style={[typography.cardTitle, { color: ink }]}>{label}</Text>
        {trailingIcon === undefined ? null : <Glyph name={trailingIcon} size={18} color={ink} />}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { alignItems: "center", height: 50, justifyContent: "center" },
  content: { alignItems: "center", flexDirection: "row" },
});
