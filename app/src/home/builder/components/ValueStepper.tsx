import type { PickerRange } from "@excerlock/condition-model";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/ui";

import { formatQuantity } from "../../model/duration";

/**
 * A bounded wheel, as a stepper. It starts empty — no threshold or ratio is ever
 * pre-filled (PRD §8, decided 2026-07-28) — so the first press lands on the
 * range's floor and every press after that moves one step.
 */
export function ValueStepper({
  label,
  range,
  value,
  onChange,
}: {
  label: string;
  range: PickerRange;
  value?: number;
  onChange: (value: number) => void;
}) {
  const { colors, spacing, typography } = useTheme();

  const step = (direction: 1 | -1) => {
    if (value === undefined) {
      onChange(range.min);
      return;
    }
    const next = round(value + direction * range.step, range.step);
    onChange(Math.min(range.max, Math.max(range.min, next)));
  };

  return (
    <View style={[styles.row, { gap: spacing.gutter }]}>
      <StepButton label={`Decrease ${label}`} glyph="−" onPress={() => step(-1)} />
      <Text style={[typography.numeric, styles.value]}>
        {value === undefined ? "Not set" : formatQuantity(value, range.unit)}
      </Text>
      <StepButton label={`Increase ${label}`} glyph="+" onPress={() => step(1)} />
      <Text style={[typography.caption, styles.hint, { color: colors.textTertiary }]}>
        {`${formatQuantity(range.min, range.unit)} – ${formatQuantity(range.max, range.unit)}`}
      </Text>
    </View>
  );
}

function StepButton({
  label,
  glyph,
  onPress,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
}) {
  const { colors, radius, typography } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.button, { backgroundColor: colors.pillSecondary, borderRadius: radius.pill }]}
    >
      <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>{glyph}</Text>
    </Pressable>
  );
}

/** Keep the value on the range's grid, and off floating-point dust. */
function round(value: number, step: number): number {
  const decimals = String(step).split(".")[1]?.length ?? 0;
  return Number(value.toFixed(decimals));
}

const styles = StyleSheet.create({
  button: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  hint: { flexBasis: "100%", textAlign: "center" },
  row: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  value: { minWidth: 140, textAlign: "center" },
});
