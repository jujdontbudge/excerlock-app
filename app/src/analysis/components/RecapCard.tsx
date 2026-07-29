import { StyleSheet, Text, View } from "react-native";

import { Card, useTheme } from "@/ui";

import { formatDayCount, formatDays, formatMinutes, type Recap } from "../model";

type RecapCardProps = {
  recap: Recap;
};

/**
 * The weekly recap (PRD §3.13 · §3.15 Tab 3 block 1) — the week in five rows,
 * led by its Time Reclaimed and the delta against the week before it.
 *
 * The delta is stated in both directions and phrased the same way each time: a
 * down week is a number, not a verdict. A week with no confession behind it
 * still recaps — it reports the usage it can see rather than a zero it cannot
 * justify — and a week that ran over the confessed average says so outright.
 *
 * Two things the PRD asks of this card are not here, because their inputs are
 * not: the **Share** button (needs the on-device share-card renderer) and the
 * 72-hour freshness window (needs the §3.14 recap moment and a clock, which this
 * module deliberately does not have). Both are listed in the module README.
 */
export function RecapCard({ recap }: RecapCardProps) {
  const { colors, spacing, typography } = useTheme();
  const measured = recap.reclaimed.status === "measured";

  return (
    <Card testID="recap-card" variant="elevated">
      <Text style={typography.caption}>WEEKLY RECAP · {recap.rangeLabel}</Text>

      <View style={[styles.hero, { gap: spacing.xs, marginTop: spacing.md }]}>
        <Text
          testID={measured ? "recap-reclaimed" : "recap-usage"}
          style={[typography.numeric, { color: colors.primary }]}
        >
          {formatMinutes(
            measured ? recap.reclaimed.reclaimedMinutes : recap.reclaimed.usageMinutes,
          )}
        </Text>
        <Text style={typography.caption}>
          {measured ? "reclaimed this week" : "in your locked apps this week"}
        </Text>
      </View>

      <Text testID="recap-delta" style={[typography.body, { marginTop: spacing.xs }]}>
        {deltaLine(recap)}
      </Text>

      {measured && recap.reclaimed.netMinutes < 0 ? (
        <Text testID="recap-over" style={[typography.body, { marginTop: spacing.xs }]}>
          This week ran {formatMinutes(-recap.reclaimed.netMinutes)} over your old daily
          average.
        </Text>
      ) : null}

      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        <Row
          label="Active days"
          testID="recap-active-days"
          value={formatDayCount(recap.activeDays, recap.dayCount)}
        />
        <Row label="Activities" testID="recap-activities" value={String(recap.activityCount)} />
        <Row
          label="Earned · spent"
          testID="recap-earned-spent"
          value={`${formatMinutes(recap.earnedMinutes)} · ${formatMinutes(recap.spentMinutes)}`}
        />
        <Row
          label="Streak at the close"
          testID="recap-streak"
          value={recap.streak.current === 0 ? "None running" : formatDays(recap.streak.current)}
        />
      </View>
    </Card>
  );
}

/** Row ①'s second line: the delta, both directions, in the same neutral phrasing. */
function deltaLine(recap: Recap): string {
  if (recap.reclaimed.status === "unconfessed") {
    return "Set a daily average in setup to see what this week reclaimed.";
  }
  if (recap.reclaimed.status === "noBaseline") {
    return "There is no daily average on record to reclaim against.";
  }
  if (recap.deltaMinutes === null) return "Your first week on record";
  if (recap.deltaMinutes === 0) return "The same as last week";
  return recap.deltaMinutes > 0
    ? `${formatMinutes(recap.deltaMinutes)} more than last week`
    : `${formatMinutes(-recap.deltaMinutes)} less than last week`;
}

function Row({ label, value, testID }: { label: string; value: string; testID: string }) {
  const { typography } = useTheme();

  return (
    <View style={styles.row}>
      <Text style={typography.body}>{label}</Text>
      <Text testID={testID} style={typography.cardTitle}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "baseline", flexDirection: "row" },
  row: { flexDirection: "row", justifyContent: "space-between" },
});
