import { View } from "react-native";

import { PillButton, useTheme } from "@/ui";

import {
  GRACE_PERIOD_OPTIONS_SECONDS,
  type GracePeriodSeconds,
} from "../store/settingsStore";
import { SettingsRow } from "./SettingsRow";

type GracePeriodPickerProps = {
  value: GracePeriodSeconds | null;
  onChange: (seconds: GracePeriodSeconds) => void;
};

export function formatGracePeriod(seconds: GracePeriodSeconds): string {
  if (seconds === 30) {
    return "30 seconds";
  }

  const minutes = seconds / 60;
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

export function GracePeriodPicker({ value, onChange }: GracePeriodPickerProps) {
  const { spacing } = useTheme();
  const options = GRACE_PERIOD_OPTIONS_SECONDS.map((seconds) => ({
    label: formatGracePeriod(seconds),
    seconds,
  }));

  return (
    <View style={{ gap: spacing.md }}>
      <SettingsRow
        title="Stop grace period"
        value={value === null ? "Choose a grace period" : formatGracePeriod(value)}
        valueTestID="grace-period-value"
        description="How long walking may pause before locked apps are shielded again."
      />
      <View style={{ gap: spacing.sm }}>
        {[options.slice(0, 3), options.slice(3)].map((row) => (
          <View key={row[0].seconds} style={[styles.optionRow, { gap: spacing.sm }]}>
            {row.map((option) => (
              <PillButton
                key={option.seconds}
                label={option.label}
                onPress={() => onChange(option.seconds)}
                variant={value === option.seconds ? "primary" : "secondary"}
                style={styles.option}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = {
  option: { flex: 1 },
  optionRow: { flexDirection: "row" },
} as const;
