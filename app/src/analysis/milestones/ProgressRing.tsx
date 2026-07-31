import { StyleSheet, View } from "react-native";

import { useTheme } from "@/ui";

type ProgressRingProps = Readonly<{
  fraction: number;
  accessibilityLabel: string;
  children: React.ReactNode;
}>;

const SEGMENT_COUNT = 36;

/** A dependency-free thin circular meter around the next badge. */
export function ProgressRing({
  fraction,
  accessibilityLabel,
  children,
}: ProgressRingProps) {
  const { colors, radius } = useTheme();
  const completed = Math.round(
    Math.min(1, Math.max(0, fraction)) * SEGMENT_COUNT,
  );

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={styles.ring}
    >
      {Array.from({ length: SEGMENT_COUNT }, (_, index) => (
        <View
          key={index}
          pointerEvents="none"
          style={[styles.segmentOrbit, { transform: [{ rotate: `${index * 10}deg` }] }]}
        >
          <View
            style={[
              styles.segment,
              {
                backgroundColor:
                  index < completed ? colors.primary : colors.cardElevated,
                borderRadius: radius.pill,
              },
            ]}
          />
        </View>
      ))}
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
  ring: { height: 68, width: 68 },
  segment: {
    alignSelf: "center",
    height: 3,
    width: 2,
  },
  segmentOrbit: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
