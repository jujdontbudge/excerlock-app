import { StyleSheet, Text, View } from "react-native";

import { PillButton, useTheme } from "@/ui";

import type { StateCardModel } from "../../model/conditionCards";
import { CardShell } from "./CardShell";

/**
 * The live variant: a state condition holds the shields open while it is true.
 * It never banks, so it shows status rather than a meter.
 */
export function StateCard({
  model,
  onStartSession,
  onStartProppedSession,
}: {
  model: StateCardModel;
  onStartSession?: (conditionId: string) => void;
  onStartProppedSession?: (conditionId: string) => void;
}) {
  const { colors, spacing, typography } = useTheme();

  return (
    <CardShell title={model.title} subtitle={model.sourceLabel} banner={model.banner}>
      <View style={[styles.status, { gap: spacing.sm }]}>
        <View
          testID={`condition-state-dot-${model.id}`}
          style={[
            styles.dot,
            { backgroundColor: model.active ? colors.success : colors.textTertiary },
          ]}
        />
        <Text style={[typography.body, { color: colors.textPrimary }]}>{model.statusLabel}</Text>
      </View>
      <Text style={typography.caption}>{model.graceLabel}</Text>
      {model.startsWalkingSession && !model.active ? (
        <View style={{ gap: spacing.sm }}>
          <PillButton
            label="Start Walk Session"
            onPress={() => onStartSession?.(model.id)}
            variant="white"
          />
          {model.startsProppedWalkingSession ? (
            <PillButton
              label="I'm propping my phone"
              onPress={() => onStartProppedSession?.(model.id)}
              variant="secondary"
            />
          ) : null}
        </View>
      ) : null}
    </CardShell>
  );
}

const styles = StyleSheet.create({
  dot: { borderRadius: 5, height: 10, width: 10 },
  status: { alignItems: "center", flexDirection: "row" },
});
