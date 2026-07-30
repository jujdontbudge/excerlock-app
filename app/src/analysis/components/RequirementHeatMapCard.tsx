import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { ScheduleDay } from "@/schedule";
import { Card, useTheme } from "@/ui";

import type {
  RequirementHeatMap,
  RequirementHeatMapCell,
  RequirementMetKind,
} from "../model";

type RequirementHeatMapCardProps = {
  heatMap: RequirementHeatMap;
};

/** Whole-week requirement cells. Day detail is added at this same interaction seam. */
export function RequirementHeatMapCard({
  heatMap,
}: RequirementHeatMapCardProps) {
  const { spacing, typography } = useTheme();

  return (
    <Card testID="requirement-heat-map-card" style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.cardTitle}>Requirement history</Text>
        <Text style={typography.body}>
          A quiet day stays neutral. Rest days sit outside the streak.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.xs }}
      >
        {heatMap.weeks.map((week, weekIndex) => (
          <View
            key={`${week[0]?.dayIndex ?? "empty"}:${weekIndex}`}
            style={{ gap: spacing.xs }}
          >
            {week.map((cell) => (
              <RequirementCell key={cell.dayIndex} cell={cell} />
            ))}
          </View>
        ))}
      </ScrollView>
    </Card>
  );
}

function RequirementCell({ cell }: { cell: RequirementHeatMapCell }) {
  const { colors, radius, spacing } = useTheme();
  const metKind = kindForState(cell.state);
  const backgroundColor =
    metKind === undefined
      ? cell.state === "missed"
        ? colors.bgNight
        : cell.state === "rest"
          ? colors.cardElevated
          : undefined
      : colors.primary;

  return (
    <Pressable
      testID={`requirement-cell-${cell.dayIndex}`}
      accessibilityRole="button"
      accessibilityLabel={cellAccessibilityLabel(cell)}
      style={[
        styles.cell,
        {
          backgroundColor,
          borderRadius: radius.sm,
          height: spacing.xxl - spacing.xs,
          width: spacing.xxl - spacing.xs,
        },
      ]}
    >
      {metKind === undefined ? null : (
        <KindGlyph kind={metKind} dayIndex={cell.dayIndex} />
      )}
    </Pressable>
  );
}

function KindGlyph({
  kind,
  dayIndex,
}: {
  kind: RequirementMetKind;
  dayIndex: number;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const testID = `requirement-kind-${kind}-${dayIndex}`;

  switch (kind) {
    case "event":
      return (
        <Text
          testID={testID}
          style={[typography.caption, { color: colors.onPrimary }]}
        >
          ✓
        </Text>
      );
    case "rate":
      return (
        <View
          testID={testID}
          style={[styles.rateGlyph, { gap: spacing.xs }]}
        >
          {[spacing.xs, spacing.sm, spacing.md].map((height) => (
            <View
              key={height}
              style={{
                backgroundColor: colors.onPrimary,
                borderRadius: radius.pill,
                height,
                width: spacing.xs,
              }}
            />
          ))}
        </View>
      );
    case "state":
      return (
        <View
          testID={testID}
          style={{
            alignItems: "center",
            backgroundColor: colors.onPrimary,
            borderRadius: radius.pill,
            height: spacing.md,
            justifyContent: "center",
            opacity: 0.45,
            width: spacing.md,
          }}
        >
          <View
            style={{
              backgroundColor: colors.onPrimary,
              borderRadius: radius.pill,
              height: spacing.xs,
              width: spacing.xs,
            }}
          />
        </View>
      );
  }
}

function kindForState(
  state: RequirementHeatMapCell["state"],
): RequirementMetKind | undefined {
  switch (state) {
    case "metByEvent":
      return "event";
    case "metByRate":
      return "rate";
    case "metByState":
      return "state";
    case "missed":
    case "rest":
    case "blank":
      return undefined;
  }
}

function cellAccessibilityLabel(cell: RequirementHeatMapCell): string {
  switch (cell.state) {
    case "metByEvent":
      return `${cell.label}, requirement met by event`;
    case "metByRate":
      return `${cell.label}, requirement met by rate`;
    case "metByState":
      return `${cell.label}, requirement met by state`;
    case "missed":
      return `${cell.label}, no qualifying activity`;
    case "rest":
      return `${cell.label}, ${inactiveDayLabel(cell.detail.scheduleDay)}`;
    case "blank":
      return `${cell.label}, ${
        cell.blankReason === "beforeHistory"
          ? "before history began"
          : "future day"
      }`;
  }
}

function inactiveDayLabel(
  scheduleDay: ScheduleDay,
): string {
  switch (scheduleDay.kind) {
    case "rest":
      return "rest day";
    case "holiday":
      return "holiday";
    case "override":
      return scheduleDay.direction === "rest"
        ? "rest override"
        : "active override";
    case "scheduledActive":
      return "scheduled active day";
  }
}

const styles = StyleSheet.create({
  cell: {
    alignItems: "center",
    justifyContent: "center",
  },
  rateGlyph: {
    alignItems: "flex-end",
    flexDirection: "row",
  },
});
