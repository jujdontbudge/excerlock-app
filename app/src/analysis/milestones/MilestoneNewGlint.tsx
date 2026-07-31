import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "@/ui";

type MilestoneNewGlintProps = Readonly<{
  active: boolean;
  badgeId: string;
  index: number;
}>;

const GLINT_DELAY_MS = 420;
const GLINT_STAGGER_MS = 120;
const GLINT_DURATION_MS = 650;

/** A single bright sweep turns the persistent New marker into an unlock glint. */
export function MilestoneNewGlint({
  active,
  badgeId,
  index,
}: MilestoneNewGlintProps) {
  const { colors, radius, typography } = useTheme();
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    sweep.setValue(0);
    if (!active) return;

    const animation = Animated.sequence([
      Animated.delay(GLINT_DELAY_MS + index * GLINT_STAGGER_MS),
      Animated.timing(sweep, {
        duration: GLINT_DURATION_MS,
        easing: Easing.inOut(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
    ]);
    animation.start();

    return () => animation.stop();
  }, [active, index, sweep]);

  return (
    <View
      style={[
        styles.marker,
        {
          backgroundColor: colors.primary,
          borderRadius: radius.pill,
        },
      ]}
      testID={`milestone-new-${badgeId}`}
    >
      <Text
        style={[
          typography.caption,
          styles.label,
          { color: colors.onPrimary },
        ]}
      >
        New
      </Text>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sweep,
          {
            transform: [
              {
                translateX: sweep.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 48],
                }),
              },
              { rotate: "18deg" },
            ],
          },
        ]}
        testID={`milestone-new-glint-sweep-${badgeId}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    lineHeight: 16,
  },
  marker: {
    alignItems: "center",
    height: 18,
    justifyContent: "center",
    minWidth: 36,
    overflow: "hidden",
    paddingHorizontal: 5,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1,
  },
  sweep: {
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    height: 28,
    left: 0,
    position: "absolute",
    top: -5,
    width: 9,
  },
});
