import { useState } from "react";
import {
  Pressable,
  Text,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";

import { useTheme } from "@/ui";

import {
  MAX_CONFESSED_DAILY_MINUTES,
  MIN_CONFESSED_DAILY_MINUTES,
} from "../store/confessionStore";

const STEP_MINUTES = 30;

function clampMinutes(minutes: number): number {
  return Math.min(
    MAX_CONFESSED_DAILY_MINUTES,
    Math.max(MIN_CONFESSED_DAILY_MINUTES, minutes),
  );
}

export function formatDailyMinutes(minutes: number): string {
  if (minutes === MAX_CONFESSED_DAILY_MINUTES) {
    return "12 or more hours";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  return `${hours} hours ${remainingMinutes} minutes`;
}

type MinutesSliderProps = {
  value: number;
  onChange: (minutes: number) => void;
};

/** A dependency-free, tappable slider with complete adjustable accessibility. */
export function MinutesSlider({ value, onChange }: MinutesSliderProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const progress =
    (value - MIN_CONFESSED_DAILY_MINUTES) /
    (MAX_CONFESSED_DAILY_MINUTES - MIN_CONFESSED_DAILY_MINUTES);

  const changeBy = (delta: number) => {
    onChange(clampMinutes(value + delta));
  };

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === "increment") {
      changeBy(STEP_MINUTES);
    } else if (event.nativeEvent.actionName === "decrement") {
      changeBy(-STEP_MINUTES);
    }
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (trackWidth === 0) {
      return;
    }

    const rawMinutes =
      MIN_CONFESSED_DAILY_MINUTES +
      (event.nativeEvent.locationX / trackWidth) *
        (MAX_CONFESSED_DAILY_MINUTES - MIN_CONFESSED_DAILY_MINUTES);
    const steppedMinutes = Math.round(rawMinutes / STEP_MINUTES) * STEP_MINUTES;
    onChange(clampMinutes(steppedMinutes));
  };

  return (
    <View style={{ alignSelf: "stretch", gap: spacing.md }}>
      <Text style={[typography.numeric, { textAlign: "center" }]}>
        {formatDailyMinutes(value)}
      </Text>
      <Pressable
        accessibilityActions={[
          { name: "increment", label: "Increase by 30 minutes" },
          { name: "decrement", label: "Decrease by 30 minutes" },
        ]}
        accessibilityLabel="Daily phone time"
        accessibilityRole="adjustable"
        accessibilityValue={{
          min: MIN_CONFESSED_DAILY_MINUTES,
          max: MAX_CONFESSED_DAILY_MINUTES,
          now: value,
          text: formatDailyMinutes(value),
        }}
        onAccessibilityAction={handleAccessibilityAction}
        onLayout={handleLayout}
        onPress={handlePress}
        style={{
          backgroundColor: colors.cardElevated,
          borderRadius: radius.pill,
          height: spacing.md,
          justifyContent: "center",
        }}
      >
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: radius.pill,
            height: spacing.md,
            width: `${progress * 100}%`,
          }}
        />
      </Pressable>
    </View>
  );
}
