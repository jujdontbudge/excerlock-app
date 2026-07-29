import { StyleSheet, Text, View } from "react-native";

import { Card, useTheme } from "@/ui";

import {
  formatDays,
  formatMinutes,
  formatSignedMinutes,
  heroReading,
  type TimeReclaimed,
} from "../model";

type TimeReclaimedHeroProps = {
  reclaimed: TimeReclaimed;
  /** What window the numeral covers. The Analysis hero reads the month (PRD §3.15 Tab 3). */
  caption?: string;
};

/**
 * The Time Reclaimed hero — "ExcerLock saved you N hours this month", the first
 * thing every Analysis visit shows (PRD §3.15 Tab 3 block 2).
 *
 * The numeral is the PRD's clamped sum, so a blowout day never subtracts from
 * it. What the clamp leaves out is stated underneath rather than hidden: when
 * days ran over the confessed average the card says how many and where the month
 * stands on balance — including when that balance is negative. A fact in plain
 * arithmetic, never a verdict (PRD sells-not-scolds).
 *
 * With no confession on record there is no baseline, so there is no number: the
 * card says what is missing and shows the usage it can honestly report.
 */
export function TimeReclaimedHero({
  reclaimed,
  caption = "reclaimed this month",
}: TimeReclaimedHeroProps) {
  const { colors, spacing, typography } = useTheme();

  if (reclaimed.status !== "measured") {
    return (
      <Card testID="time-reclaimed-hero">
        <Text style={typography.cardTitle}>
          {reclaimed.status === "unconfessed"
            ? "No baseline yet"
            : "Nothing to reclaim against"}
        </Text>
        <Text style={[typography.body, { marginTop: spacing.sm }]}>
          {reclaimed.status === "unconfessed"
            ? "Time Reclaimed measures your screen time against the daily average you give in setup. That step was skipped, so there is nothing to measure against yet."
            : `The daily average on record is ${formatMinutes(reclaimed.baselineMinutes ?? 0)}, so there is nothing to reclaim against.`}
        </Text>
        <Text
          testID="time-reclaimed-usage"
          style={[typography.body, { marginTop: spacing.sm }]}
        >
          You spent {formatMinutes(reclaimed.usageMinutes)} in your locked apps over{" "}
          {formatDays(reclaimed.dayCount)}.
        </Text>
      </Card>
    );
  }

  const hero = heroReading(reclaimed.reclaimedMinutes);

  return (
    <Card testID="time-reclaimed-hero">
      <View style={[styles.hero, { gap: spacing.xs }]}>
        <Text testID="time-reclaimed-value" style={typography.hero}>
          {hero.value}
        </Text>
        <Text
          testID="time-reclaimed-unit"
          style={[typography.heroSuffix, { marginBottom: spacing.md }]}
        >
          {hero.unit}
        </Text>
      </View>

      <Text style={[typography.cardTitle, { color: colors.primary }]}>{caption}</Text>

      <Text testID="time-reclaimed-detail" style={[typography.body, { marginTop: spacing.sm }]}>
        {formatMinutes(reclaimed.reclaimedMinutes)} against your old{" "}
        {formatMinutes(reclaimed.baselineMinutes ?? 0)} a day, over{" "}
        {formatDays(reclaimed.dayCount)}.
      </Text>

      {reclaimed.overDays > 0 ? (
        <Text testID="time-reclaimed-net" style={[typography.body, { marginTop: spacing.xs }]}>
          {reclaimed.overDays} of {formatDays(reclaimed.dayCount)} ran over that average; the
          window is {formatSignedMinutes(reclaimed.netMinutes)} on balance.
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "flex-end", flexDirection: "row" },
});
