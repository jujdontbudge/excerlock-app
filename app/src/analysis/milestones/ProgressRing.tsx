import Svg, { Circle } from "react-native-svg";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/ui";

type ProgressRingProps = Readonly<{
  fraction: number;
  accessibilityLabel: string;
  children: React.ReactNode;
}>;

const SIZE = 68;
const CENTER = SIZE / 2;
const STROKE_WIDTH = 3;
const RADIUS = CENTER - STROKE_WIDTH;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** One continuous, value-exposing circular meter around the next badge. */
export function ProgressRing({
  fraction,
  accessibilityLabel,
  children,
}: ProgressRingProps) {
  const { colors } = useTheme();
  const progress = Math.min(1, Math.max(0, fraction));

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={styles.ring}
    >
      <Svg
        height={SIZE}
        width={SIZE}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      >
        <Circle
          cx={CENTER}
          cy={CENTER}
          fill="none"
          r={RADIUS}
          stroke={colors.cardElevated}
          strokeWidth={STROKE_WIDTH}
        />
        <Circle
          cx={CENTER}
          cy={CENTER}
          fill="none"
          r={RADIUS}
          rotation={-90}
          origin={`${CENTER}, ${CENTER}`}
          stroke={colors.primary}
          strokeDasharray={[CIRCUMFERENCE, CIRCUMFERENCE]}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          strokeLinecap="round"
          strokeWidth={STROKE_WIDTH}
        />
      </Svg>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  ring: { height: SIZE, width: SIZE },
});
