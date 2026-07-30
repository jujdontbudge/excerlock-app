import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { ScheduleDay } from "@/schedule";
import { Card, useTheme } from "@/ui";

import {
  formatMinutes,
  type RequirementHeatMap,
  type RequirementHeatMapCell,
  type RequirementMetKind,
} from "../model";

type RequirementHeatMapCardProps = {
  heatMap: RequirementHeatMap;
};

/** Whole-week requirement cells with an accessible selectable day detail. */
export function RequirementHeatMapCard({
  heatMap,
}: RequirementHeatMapCardProps) {
  const { spacing, typography } = useTheme();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const selectedCell = heatMap.weeks
    .flat()
    .find(({ dayIndex }) => dayIndex === selectedDayIndex);

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
              <RequirementCell
                key={cell.dayIndex}
                cell={cell}
                selected={cell.dayIndex === selectedDayIndex}
                onSelect={() => setSelectedDayIndex(cell.dayIndex)}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      {selectedCell === undefined ? null : (
        <RequirementDayDetailPanel cell={selectedCell} />
      )}
    </Card>
  );
}

function RequirementCell({
  cell,
  selected,
  onSelect,
}: {
  cell: RequirementHeatMapCell;
  selected: boolean;
  onSelect: () => void;
}) {
  const { colors, radius, spacing } = useTheme();
  const presentation = cellPresentation(cell);
  const metKind = presentation.kind;
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
      accessibilityLabel={`${cell.label}, ${presentation.accessibilityStatus}`}
      accessibilityHint="Shows this day's requirement detail"
      accessibilityState={{ selected }}
      onPress={onSelect}
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

function RequirementDayDetailPanel({
  cell,
}: {
  cell: RequirementHeatMapCell;
}) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View
      testID="requirement-day-detail"
      style={{
        backgroundColor: colors.cardElevated,
        borderRadius: radius.md,
        gap: spacing.xs,
        padding: spacing.md,
      }}
    >
      <Text style={typography.cardTitle}>{cell.label}</Text>
      <Text style={typography.body}>
        {cellPresentation(cell).detailStatus}
      </Text>

      {cell.state === "blank" ? null : (
        <>
          <Text style={typography.body}>
            {formatMinutes(cell.detail.earnedMinutes)} earned
          </Text>
          {cell.detail.qualifiedConditions.map(({ conditionId, kind, name }) => (
            <Text key={conditionId} style={typography.caption}>
              {`${name} · ${kindLabel(kind)}`}
            </Text>
          ))}
        </>
      )}
    </View>
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
            borderColor: colors.onPrimary,
            borderRadius: radius.pill,
            borderWidth: StyleSheet.hairlineWidth,
            height: spacing.md,
            justifyContent: "center",
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

type CellPresentation = Readonly<{
  accessibilityStatus: string;
  detailStatus: string;
  kind?: RequirementMetKind;
}>;

function cellPresentation(cell: RequirementHeatMapCell): CellPresentation {
  switch (cell.state) {
    case "metByEvent":
      return {
        accessibilityStatus: "requirement met by event",
        detailStatus: "Requirement met by event",
        kind: "event",
      };
    case "metByRate":
      return {
        accessibilityStatus: "requirement met by rate",
        detailStatus: "Requirement met by rate",
        kind: "rate",
      };
    case "metByState":
      return {
        accessibilityStatus: "requirement met by state",
        detailStatus: "Requirement met by state",
        kind: "state",
      };
    case "missed":
      return {
        accessibilityStatus: "no qualifying activity",
        detailStatus: "No qualifying activity",
      };
    case "rest":
      return {
        accessibilityStatus: inactiveDayLabel(cell.detail.scheduleDay),
        detailStatus: sentenceCase(
          inactiveDayLabel(cell.detail.scheduleDay),
        ),
      };
    case "blank":
      return cell.blankReason === "beforeHistory"
        ? {
            accessibilityStatus: "before history began",
            detailStatus: "Before history began",
          }
        : {
            accessibilityStatus: "future day",
            detailStatus: "Future day",
          };
  }
}

function kindLabel(kind: RequirementMetKind): string {
  switch (kind) {
    case "event":
      return "Event";
    case "rate":
      return "Rate";
    case "state":
      return "State";
  }
}

function sentenceCase(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function inactiveDayLabel(scheduleDay: ScheduleDay): string {
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
