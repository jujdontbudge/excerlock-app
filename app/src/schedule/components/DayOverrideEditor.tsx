import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { PillButton, useTheme } from "@/ui";

import {
  formatCalendarDate,
  parseCalendarDate,
} from "../model/calendarDates";
import type { OverrideDirection } from "../model/scheduleRules";
import { useScheduleStore } from "../store/scheduleStore";

/** One-date exception editor; exceptions can make a normal rule active or rest. */
export function DayOverrideEditor() {
  const { colors, radius, spacing, typography } = useTheme();
  const overrides = useScheduleStore((state) => state.overrides);
  const setDayOverride = useScheduleStore((state) => state.setDayOverride);
  const removeDayOverride = useScheduleStore(
    (state) => state.removeDayOverride,
  );
  const [date, setDate] = useState("");
  const [error, setError] = useState<string>();

  const apply = (direction: OverrideDirection) => {
    const dayIndex = parseCalendarDate(date);
    if (dayIndex === undefined) {
      setError("Use a date in YYYY-MM-DD format.");
      return;
    }

    setDayOverride(dayIndex, direction);
    setDate("");
    setError(undefined);
  };

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.cardTitle}>One-day override</Text>
        <Text style={typography.body}>
          Make one date active or rest even when its weekly or holiday rule
          says otherwise.
        </Text>
      </View>

      <TextInput
        accessibilityLabel="Override date"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textTertiary}
        style={[
          typography.body,
          {
            backgroundColor: colors.pillSecondary,
            borderRadius: radius.sm,
            color: colors.textPrimary,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
          },
        ]}
        value={date}
      />
      {error === undefined ? null : (
        <Text accessibilityRole="alert" style={typography.body}>
          {error}
        </Text>
      )}
      <View style={{ gap: spacing.sm }}>
        <PillButton
          label="Make this date active"
          onPress={() => apply("active")}
        />
        <PillButton
          label="Make this date rest"
          onPress={() => apply("rest")}
          variant="secondary"
        />
      </View>

      {overrides.map((override) => {
        const dateLabel = formatCalendarDate(override.dayIndex);
        const directionLabel =
          override.direction === "active" ? "Active" : "Rest";
        return (
          <View key={override.dayIndex} style={{ gap: spacing.sm }}>
            <Text style={typography.body}>
              {`${dateLabel} · ${directionLabel} override`}
            </Text>
            <PillButton
              label={`Remove override for ${dateLabel}`}
              onPress={() => removeDayOverride(override.dayIndex)}
              variant="secondary"
            />
          </View>
        );
      })}
    </View>
  );
}
