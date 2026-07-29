import { StyleSheet, Text, View } from "react-native";

import { PillButton, useTheme } from "@/ui";

import {
  AFTERNOON_NUDGE_MINUTE_OPTIONS,
  useNotificationPreferencesStore,
  type AfternoonNudgeMinute,
} from "../store/notificationPreferencesStore";

export function AfternoonNudgeTimePicker() {
  const { spacing, typography } = useTheme();
  const selected = useNotificationPreferencesStore(
    (state) => state.afternoonNudgeMinuteOfDay,
  );
  const setSelected = useNotificationPreferencesStore(
    (state) => state.setAfternoonNudgeMinute,
  );
  const options = AFTERNOON_NUDGE_MINUTE_OPTIONS.map((minute) => ({
    minute,
    label: formatMinuteOfDay(minute),
  }));

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.cardTitle}>Afternoon nudge time</Text>
        <Text
          accessibilityLabel={`Selected nudge time: ${formatMinuteOfDay(
            selected,
          )}`}
          style={typography.body}
        >
          {formatMinuteOfDay(selected)}
        </Text>
      </View>
      <View style={{ gap: spacing.sm }}>
        {[options.slice(0, 2), options.slice(2, 4), options.slice(4)].map(
          (row) => (
            <View
              key={row[0].minute}
              style={[styles.optionRow, { gap: spacing.sm }]}
            >
              {row.map((option) => (
                <PillButton
                  key={option.minute}
                  label={option.label}
                  onPress={() => setSelected(option.minute)}
                  variant={
                    selected === option.minute ? "primary" : "secondary"
                  }
                  style={styles.option}
                />
              ))}
            </View>
          ),
        )}
      </View>
    </View>
  );
}

function formatMinuteOfDay(minute: AfternoonNudgeMinute): string {
  const hour24 = Math.floor(minute / 60);
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:00 ${hour24 < 12 ? "AM" : "PM"}`;
}

const styles = StyleSheet.create({
  option: {
    flex: 1,
  },
  optionRow: {
    flexDirection: "row",
  },
});
