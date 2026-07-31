import type { ImageRequireSource } from "react-native";

export type MilestoneKind = "streak" | "activity" | "timeReclaimed";

export type MilestoneDefinition = Readonly<{
  id: string;
  kind: MilestoneKind;
  threshold: number;
  thresholdLabel: string;
  milestoneName: string;
  badgeArt: ImageRequireSource;
}>;

const STREAKS = [
  streak(3, require("../../../../design/badges/streak-3-days.png")),
  streak(7, require("../../../../design/badges/streak-7-days.png")),
  streak(14, require("../../../../design/badges/streak-14-days.png")),
  streak(30, require("../../../../design/badges/streak-30-days.png")),
  streak(60, require("../../../../design/badges/streak-60-days.png")),
  streak(100, require("../../../../design/badges/streak-100-days.png")),
  streak(180, require("../../../../design/badges/streak-180-days.png")),
  streak(365, require("../../../../design/badges/streak-365-days.png")),
] as const;

const ACTIVITIES = [
  activity(1, require("../../../../design/badges/activity-1.png")),
  activity(5, require("../../../../design/badges/activity-5.png")),
  activity(10, require("../../../../design/badges/activity-10.png")),
  activity(25, require("../../../../design/badges/activity-25.png")),
  activity(50, require("../../../../design/badges/activity-50.png")),
  activity(100, require("../../../../design/badges/activity-100.png")),
  activity(250, require("../../../../design/badges/activity-250.png")),
  activity(500, require("../../../../design/badges/activity-500.png")),
] as const;

const TIME_RECLAIMED = [
  timeReclaimed(10, require("../../../../design/badges/time-reclaimed-10-hours.png")),
  timeReclaimed(25, require("../../../../design/badges/time-reclaimed-25-hours.png")),
  timeReclaimed(50, require("../../../../design/badges/time-reclaimed-50-hours.png")),
  timeReclaimed(100, require("../../../../design/badges/time-reclaimed-100-hours.png")),
  timeReclaimed(250, require("../../../../design/badges/time-reclaimed-250-hours.png")),
  timeReclaimed(500, require("../../../../design/badges/time-reclaimed-500-hours.png")),
] as const;

export const MILESTONE_LADDERS = [
  { kind: "streak", title: "Streaks", badges: STREAKS },
  { kind: "activity", title: "Activities", badges: ACTIVITIES },
  {
    kind: "timeReclaimed",
    title: "Time Reclaimed",
    badges: TIME_RECLAIMED,
  },
] as const;

export const MILESTONES = [
  ...STREAKS,
  ...ACTIVITIES,
  ...TIME_RECLAIMED,
] as const;

export type MilestoneId = (typeof MILESTONES)[number]["id"];

export function isMilestoneId(value: unknown): value is MilestoneId {
  return (
    typeof value === "string" &&
    MILESTONES.some(({ id }) => id === value)
  );
}

function streak<const Threshold extends number>(
  threshold: Threshold,
  badgeArt: ImageRequireSource,
) {
  return {
    id: `streak-${threshold}`,
    kind: "streak",
    threshold,
    thresholdLabel: `${threshold} days`,
    milestoneName: `${threshold}-Day Streak`,
    badgeArt,
  } as const satisfies MilestoneDefinition;
}

function activity<const Threshold extends number>(
  threshold: Threshold,
  badgeArt: ImageRequireSource,
) {
  return {
    id: `activity-${threshold}`,
    kind: "activity",
    threshold,
    thresholdLabel: `${threshold} ${threshold === 1 ? "activity" : "activities"}`,
    milestoneName: `${threshold} ${threshold === 1 ? "Activity" : "Activities"}`,
    badgeArt,
  } as const satisfies MilestoneDefinition;
}

function timeReclaimed<const Threshold extends number>(
  threshold: Threshold,
  badgeArt: ImageRequireSource,
) {
  return {
    id: `time-reclaimed-${threshold}`,
    kind: "timeReclaimed",
    threshold,
    thresholdLabel: `${threshold} hours`,
    milestoneName: `${threshold} Hours Reclaimed`,
    badgeArt,
  } as const satisfies MilestoneDefinition;
}
