import { StyleSheet, Switch, Text, View } from "react-native";

import { Card, useTheme } from "@/ui";

import type { Weekday } from "../model/scheduleRules";
import { useScheduleStore } from "../store/scheduleStore";
import { DayOverrideEditor } from "./DayOverrideEditor";
import { HolidayEditor } from "./HolidayEditor";

const WEEKDAYS: readonly Readonly<{
  index: Weekday;
  name: string;
}>[] = [
  { index: 1, name: "Monday" },
  { index: 2, name: "Tuesday" },
  { index: 3, name: "Wednesday" },
  { index: 4, name: "Thursday" },
  { index: 5, name: "Friday" },
  { index: 6, name: "Saturday" },
  { index: 0, name: "Sunday" },
];

/** Manage's single surface for recurring, ranged, and one-day schedule rules. */
export function ScheduleRulesCard() {
  const { colors, spacing, typography } = useTheme();
  const restWeekdays = useScheduleStore(
    (state) => state.recurringRestWeekdays,
  );
  const setRecurringRestDay = useScheduleStore(
    (state) => state.setRecurringRestDay,
  );

  return (
    <Card testID="schedule-rules-card" style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.cardTitle}>Weekly schedule</Text>
        <Text style={typography.body}>
          Active days use your full economy. Rest days stay out of missed-day
          and streak counts.
        </Text>
      </View>

      <View style={{ gap: spacing.md }}>
        {WEEKDAYS.map(({ index, name }) => {
          const isRest = restWeekdays.includes(index);
          return (
            <View
              key={index}
              style={[styles.weekdayRow, { gap: spacing.md }]}
            >
              <View style={styles.weekdayCopy}>
                <Text style={typography.cardTitle}>{name}</Text>
                <Text
                  testID={`schedule-weekday-status-${index}`}
                  style={typography.body}
                >
                  {isRest ? "Rest" : "Active"}
                </Text>
              </View>
              <Switch
                accessibilityLabel={`${name} rest day`}
                value={isRest}
                onValueChange={(value) => setRecurringRestDay(index, value)}
                trackColor={{
                  false: colors.pillSecondary,
                  true: colors.primary,
                }}
              />
            </View>
          );
        })}
      </View>

      <HolidayEditor />

      <DayOverrideEditor />
    </Card>
  );
}

const styles = StyleSheet.create({
  weekdayCopy: { flex: 1 },
  weekdayRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
