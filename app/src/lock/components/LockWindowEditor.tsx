import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PillButton, useTheme } from "@/ui";

import {
  WEEKDAYS,
  type RecurringLockWindow,
  type SaveRecurringLockWindowResult,
  type Weekday,
} from "../model/recurringLockWindow";
import {
  DAY_PICKER_LABEL,
  formatTimeInput,
  nextRecurringWindowId,
  parseTimeInput,
} from "../model/windowCopy";

interface LockWindowEditorProps {
  readonly initial: RecurringLockWindow | null;
  readonly windows: readonly RecurringLockWindow[];
  readonly onSave: (
    window: RecurringLockWindow,
  ) => Promise<SaveRecurringLockWindowResult>;
  readonly onCancel: () => void;
  readonly onSaved: () => void;
}

/** One create/edit form. Blank create fields ensure the user chooses every knob. */
export function LockWindowEditor({
  initial,
  windows,
  onSave,
  onCancel,
  onSaved,
}: LockWindowEditorProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const [days, setDays] = useState<readonly Weekday[]>(initial?.days ?? []);
  const [start, setStart] = useState(
    initial === null ? "" : formatTimeInput(initial.startMinute),
  );
  const [end, setEnd] = useState(
    initial === null ? "" : formatTimeInput(initial.endMinute),
  );
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (days.length === 0) {
      setError("Choose at least one day.");
      return;
    }
    const startMinute = parseTimeInput(start);
    const endMinute = parseTimeInput(end);
    if (startMinute === null || endMinute === null) {
      setError("Use 24-hour times in HH:MM format, like 09:30.");
      return;
    }
    if (startMinute === endMinute) {
      setError("Start and end must differ. Choose a non-zero time range.");
      return;
    }

    const result = await onSave({
      id: initial?.id ?? nextRecurringWindowId(windows),
      days,
      startMinute,
      endMinute,
    });
    if (result.ok) {
      onSaved();
      return;
    }
    setError(
      result.error === "overlap"
        ? "That overlaps an existing lock window. Choose different days or times."
        : result.error === "noDays"
          ? "Choose at least one day."
          : result.error === "emptyInterval"
            ? "Start and end must differ. Choose a non-zero time range."
            : "Use 24-hour times in HH:MM format, like 09:30.",
    );
  };

  return (
    <View
      style={{
        backgroundColor: colors.cardElevated,
        borderRadius: radius.md,
        gap: spacing.md,
        padding: spacing.md,
      }}
    >
      <Text style={typography.cardTitle}>
        {initial === null ? "New lock window" : "Edit lock window"}
      </Text>
      <View style={{ gap: spacing.sm }}>
        <Text style={typography.caption}>Days</Text>
        <View style={[styles.days, { gap: spacing.xs }]}>
          {WEEKDAYS.map((day) => {
            const selected = days.includes(day);
            return (
              <Pressable
                key={day}
                accessibilityLabel={`${day[0]!.toUpperCase()}${day.slice(1)}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  setDays(
                    selected
                      ? days.filter((candidate) => candidate !== day)
                      : [...days, day],
                  );
                  setError(null);
                }}
                style={[
                  styles.day,
                  {
                    backgroundColor: selected
                      ? colors.primary
                      : colors.pillSecondary,
                    borderRadius: radius.pill,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: colors.textPrimary },
                  ]}
                >
                  {DAY_PICKER_LABEL[day]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={[styles.times, { gap: spacing.sm }]}>
        <TimeField
          label="Start time"
          value={start}
          onChange={(value) => {
            setStart(value);
            setError(null);
          }}
        />
        <TimeField
          label="End time"
          value={end}
          onChange={(value) => {
            setEnd(value);
            setError(null);
          }}
        />
      </View>
      <Text style={typography.caption}>
        Use local 24-hour time. An end earlier than the start continues overnight.
      </Text>
      {error === null ? null : (
        <Text accessibilityRole="alert" style={[typography.body, { color: colors.danger }]}>
          {error}
        </Text>
      )}
      <PillButton label="Save lock window" onPress={save} />
      <PillButton label="Cancel" variant="secondary" onPress={onCancel} />
    </View>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  return (
    <View style={[styles.timeField, { gap: spacing.xs }]}>
      <Text style={typography.caption}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        onChangeText={onChange}
        placeholder="HH:MM"
        placeholderTextColor={colors.textTertiary}
        style={[
          typography.body,
          {
            backgroundColor: colors.pillSecondary,
            borderRadius: radius.sm,
            color: colors.textPrimary,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          },
        ]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  day: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  days: { flexDirection: "row", flexWrap: "wrap" },
  timeField: { flex: 1 },
  times: { flexDirection: "row" },
});
