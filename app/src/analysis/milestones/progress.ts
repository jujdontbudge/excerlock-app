import {
  isMilestoneId,
  MILESTONE_LADDERS,
  type MilestoneDefinition,
  type MilestoneId,
  type MilestoneKind,
} from "./catalog";

export type MilestoneMetrics = Readonly<{
  currentStreakDays: number;
  longestStreakDays: number;
  activityCount: number;
  timeReclaimedMinutes: number;
}>;

export type MilestoneProgress = Readonly<{
  current: number;
  target: number;
  label: string;
  fraction: number;
}>;

export type MilestoneBadge = MilestoneDefinition &
  Readonly<{
    state: "unlocked" | "nextUp" | "locked";
    progress: MilestoneProgress | null;
  }>;

export type MilestoneRow = Readonly<{
  kind: MilestoneKind;
  title: string;
  badges: readonly MilestoneBadge[];
}>;

/** The complete shelf projection. It never hides an item from the fixed catalog. */
export function buildMilestoneRows(
  metrics: MilestoneMetrics,
): readonly MilestoneRow[] {
  return MILESTONE_LADDERS.map((ladder) => {
    const achieved = achievedReading(ladder.kind, metrics);
    const progress = progressReading(ladder.kind, metrics);
    const nextIndex = ladder.badges.findIndex(
      ({ threshold }) => achieved < threshold,
    );

    return {
      kind: ladder.kind,
      title: ladder.title,
      badges: ladder.badges.map((definition, index) => {
        const state =
          achieved >= definition.threshold
            ? "unlocked"
            : index === nextIndex
              ? "nextUp"
              : "locked";
        return {
          ...definition,
          state,
          progress:
            state === "nextUp"
              ? makeProgress(
                  ladder.kind,
                  progress,
                  definition.threshold,
                )
              : null,
        };
      }),
    };
  });
}

export function unlockedMilestoneIds(
  rows: readonly MilestoneRow[],
): readonly MilestoneId[] {
  return rows.flatMap(({ badges }) =>
    badges
      .filter(({ state }) => state === "unlocked")
      .map(({ id }) => id)
      .filter(isMilestoneId),
  );
}

export function progressForMilestone(
  milestone: MilestoneDefinition,
  metrics: MilestoneMetrics,
): MilestoneProgress {
  return makeProgress(
    milestone.kind,
    progressReading(milestone.kind, metrics),
    milestone.threshold,
  );
}

function achievedReading(
  kind: MilestoneKind,
  metrics: MilestoneMetrics,
): number {
  switch (kind) {
    case "streak":
      return metrics.longestStreakDays;
    case "activity":
      return metrics.activityCount;
    case "timeReclaimed":
      return metrics.timeReclaimedMinutes / 60;
  }
}

function progressReading(
  kind: MilestoneKind,
  metrics: MilestoneMetrics,
): number {
  switch (kind) {
    case "streak":
      return metrics.currentStreakDays;
    case "activity":
      return metrics.activityCount;
    case "timeReclaimed":
      return metrics.timeReclaimedMinutes / 60;
  }
}

function makeProgress(
  kind: MilestoneKind,
  reading: number,
  target: number,
): MilestoneProgress {
  const current = Math.max(0, Math.floor(reading));
  const unit =
    kind === "streak"
      ? "days"
      : kind === "activity"
        ? "activities"
        : "hours";
  return {
    current,
    target,
    label: `${current}/${target} ${unit}`,
    fraction: Math.min(1, Math.max(0, reading / target)),
  };
}
