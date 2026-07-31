import { BlurView } from "expo-blur";
import { Pressable, StyleSheet } from "react-native";

import { useTheme } from "../theme";

type DismissalBlurProps = Readonly<{
  accessibilityLabel: string;
  onDismiss: () => void;
}>;

/** Light-ivory material behind a sheet; the material itself is its dismiss action. */
export function DismissalBlur({
  accessibilityLabel,
  onDismiss,
}: DismissalBlurProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onDismiss}
      style={StyleSheet.absoluteFill}
    >
      <BlurView
        intensity={72}
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.ivoryBlur },
        ]}
        tint="systemUltraThinMaterialLight"
      />
    </Pressable>
  );
}
