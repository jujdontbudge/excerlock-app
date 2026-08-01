import { StyleSheet, View } from "react-native";

import { PillButton, useTheme } from "@/ui";

import type { WeekStart } from "../store/settingsStore";
import { SettingsRow } from "./SettingsRow";

type WeekStartPickerProps = Readonly<{
  value: WeekStart;
  onChange: (weekday: WeekStart) => void;
}>;

const WEEK_START_LABELS: Record<WeekStart, string> = {
  0: "Sunday",
  1: "Monday",
};

const OPTIONS: ReadonlyArray<{ label: string; value: WeekStart }> = [
  { label: WEEK_START_LABELS[1], value: 1 },
  { label: WEEK_START_LABELS[0], value: 0 },
];

export function WeekStartPicker({ value, onChange }: WeekStartPickerProps) {
  const { spacing } = useTheme();
  const selectedLabel = WEEK_START_LABELS[value];

  return (
    <View style={{ gap: spacing.md }}>
      <SettingsRow
        title="Start week on"
        value={selectedLabel}
        valueAccessibilityLabel={`Selected week start: ${selectedLabel}`}
        description="Sets the boundary used by weekly recaps."
      />
      <View style={[styles.options, { gap: spacing.sm }]}>
        {OPTIONS.map((option) => (
          <PillButton
            key={option.value}
            label={option.label}
            onPress={() => onChange(option.value)}
            variant={value === option.value ? "primary" : "secondary"}
            style={styles.option}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  option: { flex: 1 },
  options: { flexDirection: "row" },
});
