import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { useTheme } from "../theme";
import type { GradientName } from "../theme";

type ScreenProps = {
  children?: ReactNode;
  /** Which of the brand gradients paints this surface. */
  variant?: GradientName;
  /** Safe-area edges to inset. The bottom stays open under the floating tab bar. */
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Every ExcerLock surface starts here: one full-bleed vertical gradient with a
 * safe-area content well on top of it.
 */
export function Screen({
  children,
  variant = "screen",
  edges = ["top", "left", "right"],
  style,
  testID,
}: ScreenProps) {
  const { gradients } = useTheme();
  const gradient = gradients[variant];

  return (
    <LinearGradient
      testID={testID}
      colors={[...gradient.colors]}
      locations={[...gradient.locations]}
      start={gradient.start}
      end={gradient.end}
      style={styles.fill}
    >
      <SafeAreaView edges={[...edges]} style={[styles.fill, style]}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
