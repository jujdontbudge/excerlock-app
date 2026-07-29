import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { PillButton, useTheme } from "@/ui";

import {
  formatCalendarDate,
  parseCalendarDate,
} from "../model/calendarDates";
import { useScheduleStore } from "../store/scheduleStore";

const INVALID_RANGE_COPY =
  "Use YYYY-MM-DD and put the end on or after the start.";

/** Calendar-date input for planned, streak-safe time away. */
export function HolidayEditor() {
  const { colors, radius, spacing, typography } = useTheme();
  const holidays = useScheduleStore((state) => state.holidays);
  const addHoliday = useScheduleStore((state) => state.addHoliday);
  const removeHoliday = useScheduleStore((state) => state.removeHoliday);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string>();

  const add = () => {
    const startDayIndex = parseCalendarDate(startDate);
    const endDayIndex = parseCalendarDate(endDate);
    if (
      startDayIndex === undefined ||
      endDayIndex === undefined ||
      startDayIndex > endDayIndex
    ) {
      setError(INVALID_RANGE_COPY);
      return;
    }

    addHoliday({ startDayIndex, endDayIndex });
    setStartDate("");
    setEndDate("");
    setError(undefined);
  };

  const inputStyle = [
    typography.body,
    {
      backgroundColor: colors.pillSecondary,
      borderRadius: radius.sm,
      color: colors.textPrimary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
  ];

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.cardTitle}>Holiday dates</Text>
        <Text style={typography.body}>
          Plan a date range that should be streak-safe and not mistaken for
          missed training.
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <TextInput
          accessibilityLabel="Holiday start date"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setStartDate}
          placeholder="Start · YYYY-MM-DD"
          placeholderTextColor={colors.textTertiary}
          style={inputStyle}
          value={startDate}
        />
        <TextInput
          accessibilityLabel="Holiday end date"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setEndDate}
          placeholder="End · YYYY-MM-DD"
          placeholderTextColor={colors.textTertiary}
          style={inputStyle}
          value={endDate}
        />
        {error === undefined ? null : (
          <Text accessibilityRole="alert" style={typography.body}>
            {error}
          </Text>
        )}
        <PillButton label="Add holiday" onPress={add} />
      </View>

      {holidays.map((holiday) => {
        const start = formatCalendarDate(holiday.startDayIndex);
        const end = formatCalendarDate(holiday.endDayIndex);
        return (
          <View
            key={`${holiday.startDayIndex}:${holiday.endDayIndex}`}
            style={{ gap: spacing.sm }}
          >
            <Text style={typography.body}>{`${start} – ${end}`}</Text>
            <PillButton
              label={`Remove holiday ${start} to ${end}`}
              onPress={() => removeHoliday(holiday)}
              variant="secondary"
            />
          </View>
        );
      })}
    </View>
  );
}
