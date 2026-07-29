import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../theme";

type CardProps = {
  children?: ReactNode;
  /** `elevated` layers a second translucency step for stacked cards. */
  variant?: "default" | "elevated";
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A translucent, borderless card. Hierarchy on the gradient comes from layered
 * translucency — never from strokes or shadows.
 */
export function Card({ children, variant = "default", style, testID }: CardProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: variant === "elevated" ? colors.cardElevated : colors.card,
          borderRadius: radius.lg,
          padding: spacing.gutter,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
