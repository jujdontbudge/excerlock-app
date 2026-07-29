import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  allowanceLabel,
  BASE_ALLOWANCE_RANGE,
  stepBaseAllowance,
  type AllowanceValues,
} from "@/home";
import { fullLockConfirmation } from "@/lock";
import { Card, PillButton, useTheme } from "@/ui";

/**
 * The base-allowance picker (PRD §3.15 Tab 2, grid in §8): 0–4 h in 5-minute
 * steps, with Unlimited one step past the top and Full Lock at the bottom.
 *
 * It holds no state. `minutes` comes from the allowance's one owner and every
 * press hands the next value straight back, so this card and the lock surface's
 * Full Lock switch are two views of the same number rather than two copies of
 * it (`app/src/home/model/allowance.ts`).
 */
export function AllowanceCard({
  allowance,
  onChange,
  onFullLockChange,
}: {
  allowance: AllowanceValues;
  onChange: (minutes: number) => void;
  onFullLockChange: (on: boolean) => Promise<void> | void;
}) {
  const { colors, spacing, typography } = useTheme();
  const { baseAllowanceMinutes: minutes } = allowance;
  const [pendingFullLock, setPendingFullLock] = useState<boolean | null>(null);

  const chooseStep = (direction: 1 | -1) => {
    const next = stepBaseAllowance(minutes, direction);
    if (next === minutes) {
      return;
    }
    if ((minutes === 0) !== (next === 0)) {
      setPendingFullLock(next === 0);
      return;
    }
    onChange(next);
  };

  if (pendingFullLock !== null) {
    const confirmation = fullLockConfirmation(allowance, pendingFullLock);
    return (
      <Card>
        <View style={{ gap: spacing.md }}>
          <Text style={typography.cardTitle}>{confirmation.title}</Text>
          <Text style={typography.body}>{confirmation.body}</Text>
          <PillButton
            label={confirmation.confirmLabel}
            variant="white"
            onPress={async () => {
              await onFullLockChange(pendingFullLock);
              setPendingFullLock(null);
            }}
          />
          <PillButton
            label={confirmation.cancelLabel}
            variant="secondary"
            onPress={() => setPendingFullLock(null)}
          />
        </View>
      </Card>
    );
  }

  return (
    <Card>
      <View style={{ gap: spacing.sm }}>
        <Text style={typography.cardTitle}>Daily allowance</Text>
        <Text style={[typography.caption, { color: colors.textTertiary }]}>
          What every day starts with, before you earn anything. Zero is Full Lock.
        </Text>

        <View style={[styles.row, { gap: spacing.gutter }]}>
          <StepButton
            label="Decrease daily allowance"
            glyph="−"
            onPress={() => chooseStep(-1)}
          />
          <Text
            testID="manage-allowance-value"
            style={[typography.numeric, styles.value]}
          >
            {allowanceLabel(minutes)}
          </Text>
          <StepButton
            label="Increase daily allowance"
            glyph="+"
            onPress={() => chooseStep(1)}
          />
          <Text
            style={[styles.hint, typography.caption, { color: colors.textTertiary }]}
          >
            {`Full Lock – ${allowanceLabel(BASE_ALLOWANCE_RANGE.max)} – Unlimited`}
          </Text>
        </View>
      </View>
    </Card>
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
      style={[
        styles.button,
        { backgroundColor: colors.pillSecondary, borderRadius: radius.pill },
      ]}
    >
      <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
        {glyph}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  hint: { flexBasis: "100%", textAlign: "center" },
  row: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  value: { minWidth: 140, textAlign: "center" },
});
