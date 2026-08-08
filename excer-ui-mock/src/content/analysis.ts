import type { HeatCellKind } from "./types";

export const analysisNaturalFixture = {
  range: "week",
  timeReclaimedThisMonthMinutes: 0,
  timeReclaimedAllTimeMinutes: 0,
  currentStreak: 0,
  longestStreak: 0,
  activityCount: 0,
  earnedThisMonthMinutes: 0,
  history: "empty",
} as const;

export const analysisShowcaseOverviewFixture = {
  range: "week",
  timeReclaimedThisMonthMinutes: 1122,
  timeReclaimedThisMonthLabel: "18h 42m",
  timeReclaimedAllTimeMinutes: 4080,
  timeReclaimedAllTimeLabel: "68h",
  currentStreak: 12,
  longestStreak: 21,
  activityCount: 43,
  earnedThisMonthMinutes: 590,
  history: "populated",
} as const;

export const analysisOverviewCopy = {
  title: "Analysis",
  sampleLabel: "Sample data",
  hero: {
    eyebrow: "Time Reclaimed",
    value: "18h 42m",
    conclusion: "You took back 18h 42m this month.",
    methodLink: "How this is calculated",
  },
  trend: {
    title: "Screen time and earning",
    conclusion: "You reclaimed 11h 13m so far this week.",
  },
  streak: { title: "Your streak", value: "12 days current · 21 days longest" },
  earning: { title: "Your favorite ways to earn" },
  milestones: { title: "Milestones" },
  empty: {
    title: "Your first insight starts with one active day.",
    body: "The chart, streak map, earning breakdown, and milestone shelf will fill with sample history after a condition completes.",
    primary: "Start today",
  },
} as const;

export const analysisEmptyShell = {
  timeReclaimed: { value: "—", conclusion: "Your first reclaimed hour will appear here." },
  trend: {
    conclusion: "No sample days yet.",
    slots: 7,
    preserveAxes: true,
    preserveLegend: true,
  },
  streak: { current: 0, longest: 0, label: "0 days current · 0 days longest." },
  heatMap: { cells: 28, accessibilitySummary: "No sample history in this four-week range." },
  earning: { total: "0 min", body: "Your first completed condition will appear here." },
  milestones: { visibleCount: 22, progressMode: "zero", nextBadgePerGroup: true },
} as const;

export const weeklyRecapFixture = {
  range: "Jul 27–Aug 2",
  hero: "6h 20m reclaimed",
  delta: "42 min more than the week before",
  activeDays: "5 of 6 active days",
  earnCount: "7 earns · most from gym visits",
  earnedVsSpent: "4h 50m earned · 5h 25m spent",
  streak: "7-day streak at week’s end",
  cta: "Share recap",
  freshnessHours: 72,
  neutralDownDeltaExample: "2h less than last week",
} as const;

export const weekTrendFixture = [
  { date: "2026-08-03", day: "Mon Aug 3", lockedAppUseMinutes: 172, earnedMinutes: 45, reclaimedMinutes: 128, state: "complete" },
  { date: "2026-08-04", day: "Tue Aug 4", lockedAppUseMinutes: 201, earnedMinutes: 60, reclaimedMinutes: 99, state: "complete" },
  { date: "2026-08-05", day: "Wed Aug 5", lockedAppUseMinutes: 148, earnedMinutes: 80, reclaimedMinutes: 152, state: "complete" },
  { date: "2026-08-06", day: "Thu Aug 6", lockedAppUseMinutes: 214, earnedMinutes: 40, reclaimedMinutes: 86, state: "complete" },
  { date: "2026-08-07", day: "Fri Aug 7", lockedAppUseMinutes: 92, earnedMinutes: 125, reclaimedMinutes: 208, state: "today" },
  { date: "2026-08-08", day: "Sat Aug 8", lockedAppUseMinutes: null, earnedMinutes: null, reclaimedMinutes: null, state: "future" },
  { date: "2026-08-09", day: "Sun Aug 9", lockedAppUseMinutes: null, earnedMinutes: null, reclaimedMinutes: null, state: "futureRest" },
] as const;

export const weekTrendSummary = {
  conclusion: "You reclaimed 11h 13m so far this week.",
  comparison: "4h 53m more than last week.",
  bestDay: "Friday · 3h 28m reclaimed.",
  lowestDay: "Thursday · 1h 26m reclaimed.",
  average: "2h 15m per completed day.",
  accessibilitySummary: "From Monday through Friday, sample locked-app use totaled 13h 47m, earning totaled 5h 50m, and reclaimed time totaled 11h 13m.",
} as const;

export const monthTrendFixture = [
  { period: "Aug 1–2", reclaimed: "7h 29m", minutes: 449, state: "complete" },
  { period: "Aug 3–9", reclaimed: "11h 13m", minutes: 673, state: "current" },
  { period: "Aug 10–16", reclaimed: null, minutes: null, state: "future" },
  { period: "Aug 17–23", reclaimed: null, minutes: null, state: "future" },
  { period: "Aug 24–30", reclaimed: null, minutes: null, state: "future" },
  { period: "Aug 31", reclaimed: null, minutes: null, state: "future" },
] as const;

export const yearTrendFixture = [
  { month: "May", reclaimed: "12h 40m", minutes: 760, state: "complete" },
  { month: "June", reclaimed: "16h 05m", minutes: 965, state: "complete" },
  { month: "July", reclaimed: "20h 33m", minutes: 1233, state: "complete" },
  { month: "August", reclaimed: "18h 42m", minutes: 1122, state: "current" },
  { month: "September–December", reclaimed: null, minutes: null, state: "future" },
] as const;

export const trendDetailCopy = {
  title: "Time Reclaimed",
  segments: ["Week", "Month", "Year"],
  period: "Aug 3–9",
  comparisonRow: { label: "Compared with", value: "None" },
  methodTitle: "What Time Reclaimed means",
  methodBody: "Each sample day compares the fixed 5-hour starting point with that day’s sample locked-app use. A high-use day never subtracts from the total.",
  comparisonOptions: ["None", "Steps", "Workout minutes", "Conditions completed", "Unlock time used", "Blocked attempts"],
} as const;

export const heatMapLegend = [
  { kind: "event", glyph: "check", description: "First met by a completed event." },
  { kind: "rate", glyph: "mini-bar", description: "First met by continuous credit." },
  { kind: "state", glyph: "pulse-dot", description: "First met by sustained state." },
  { kind: "missed", glyph: "none", description: "Active day not met." },
  { kind: "rest", glyph: "none", description: "Rest, holiday, or override." },
  { kind: "blank", glyph: "none", description: "Future or before install." },
] as const;

export type HeatMapCell = {
  date: string;
  label: string;
  kind: HeatCellKind;
  glyph: "check" | "mini-bar" | "pulse-dot" | "none";
  accessibilitySummary: string;
};

export const heatMapFixture = [
  { date: "2026-07-13", label: "Jul 13", kind: "event", glyph: "check", accessibilitySummary: "Active day met by Go to gym." },
  { date: "2026-07-14", label: "Jul 14", kind: "rate", glyph: "mini-bar", accessibilitySummary: "Active day met by Steps exchange." },
  { date: "2026-07-15", label: "Jul 15", kind: "state", glyph: "pulse-dot", accessibilitySummary: "Active day met by While walking." },
  { date: "2026-07-16", label: "Jul 16", kind: "event", glyph: "check", accessibilitySummary: "Active day met by Go to gym." },
  { date: "2026-07-17", label: "Jul 17", kind: "rate", glyph: "mini-bar", accessibilitySummary: "Active day met by Steps exchange." },
  { date: "2026-07-18", label: "Jul 18", kind: "event", glyph: "check", accessibilitySummary: "Active day met by Distance goal." },
  { date: "2026-07-19", label: "Jul 19", kind: "rest", glyph: "none", accessibilitySummary: "Rest day; streak unchanged." },
  { date: "2026-07-20", label: "Jul 20", kind: "state", glyph: "pulse-dot", accessibilitySummary: "Active day met by While walking." },
  { date: "2026-07-21", label: "Jul 21", kind: "event", glyph: "check", accessibilitySummary: "Active day met by Go to gym." },
  { date: "2026-07-22", label: "Jul 22", kind: "rate", glyph: "mini-bar", accessibilitySummary: "Active day met by Steps exchange." },
  { date: "2026-07-23", label: "Jul 23", kind: "state", glyph: "pulse-dot", accessibilitySummary: "Active day met by While walking." },
  { date: "2026-07-24", label: "Jul 24", kind: "missed", glyph: "none", accessibilitySummary: "Active day not met; neutral sample state." },
  { date: "2026-07-25", label: "Jul 25", kind: "event", glyph: "check", accessibilitySummary: "Active day met by Go to gym." },
  { date: "2026-07-26", label: "Jul 26", kind: "rest", glyph: "none", accessibilitySummary: "Rest day; streak unchanged." },
  { date: "2026-07-27", label: "Jul 27", kind: "event", glyph: "check", accessibilitySummary: "Active day met by Go to gym." },
  { date: "2026-07-28", label: "Jul 28", kind: "rate", glyph: "mini-bar", accessibilitySummary: "Active day met by Steps exchange." },
  { date: "2026-07-29", label: "Jul 29", kind: "state", glyph: "pulse-dot", accessibilitySummary: "Active day met by While walking." },
  { date: "2026-07-30", label: "Jul 30", kind: "event", glyph: "check", accessibilitySummary: "Active day met by Distance goal." },
  { date: "2026-07-31", label: "Jul 31", kind: "rate", glyph: "mini-bar", accessibilitySummary: "Active day met by Steps exchange." },
  { date: "2026-08-01", label: "Aug 1", kind: "event", glyph: "check", accessibilitySummary: "Active day met by Go to gym." },
  { date: "2026-08-02", label: "Aug 2", kind: "rest", glyph: "none", accessibilitySummary: "Rest day; streak unchanged." },
  { date: "2026-08-03", label: "Aug 3", kind: "event", glyph: "check", accessibilitySummary: "Active day met by Go to gym." },
  { date: "2026-08-04", label: "Aug 4", kind: "rate", glyph: "mini-bar", accessibilitySummary: "Active day met by Steps exchange." },
  { date: "2026-08-05", label: "Aug 5", kind: "state", glyph: "pulse-dot", accessibilitySummary: "Active day met by While walking." },
  { date: "2026-08-06", label: "Aug 6", kind: "event", glyph: "check", accessibilitySummary: "Active day met by Go to gym." },
  { date: "2026-08-07", label: "Aug 7", kind: "rate", glyph: "mini-bar", accessibilitySummary: "Active day met by Steps exchange." },
  { date: "2026-08-08", label: "Aug 8", kind: "blank", glyph: "none", accessibilitySummary: "Future day." },
  { date: "2026-08-09", label: "Aug 9", kind: "blank", glyph: "none", accessibilitySummary: "Future Rest day." },
] as const satisfies readonly HeatMapCell[];

export const dayDetailFixtures = {
  event: { title: "Thursday, Aug 6", status: "Goal met at 6:42 PM", evidence: "Go to gym completed first.", values: "30 min earned · 84 min spent", action: "View earning" },
  rate: { title: "Friday, Aug 7", status: "Goal met at 11:06 AM", evidence: "Steps exchange reached the 15-minute streak floor first.", values: "125 min earned · 92 min spent", action: "View earning" },
  state: { title: "Wednesday, Aug 5", status: "Goal met at 8:54 AM", evidence: "While walking stayed active for 10 minutes.", values: "24 min active · 0 min banked · 108 min spent", action: "View earning" },
  missed: { title: "Friday, Jul 24", status: "This active day wasn’t met.", evidence: "No condition reached the meaningful-activity floor.", values: "0 min earned · 130 min spent", action: "Start today" },
  rest: { title: "Sunday, Aug 2", status: "Rest day", evidence: "Rest days neither extend nor break the streak.", values: "No requirement", action: "Done" },
  blank: { title: "Sunday, Aug 9", status: "No sample data yet.", evidence: "This day is in the future.", values: "—", action: "Done" },
} as const;

export const earningBreakdownFixture = {
  title: "Earning",
  total: "9h 50m banked this month",
  totalMinutes: 590,
  segments: ["Week", "Month"],
  rows: [
    { id: "demo-steps", rank: 1, condition: "Steps exchange", minutes: 245, sharePercent: 42, subtitle: "Your top source" },
    { id: "demo-gym", rank: 2, condition: "Go to gym", minutes: 180, sharePercent: 31, subtitle: "6 completed check-ins" },
    { id: "demo-distance", rank: 3, condition: "Distance goal", minutes: 105, sharePercent: 18, subtitle: "3 recorded runs" },
    { id: "demo-active-minutes", rank: 4, condition: "Active-minutes goal", minutes: 60, sharePercent: 10, subtitle: "2 completed goals" },
  ],
  timeOfDay: [
    { label: "Morning", percent: 22 },
    { label: "Afternoon", percent: 31 },
    { label: "Evening", percent: 47 },
  ],
  conclusion: "You earned most often in the evening.",
  methodBody: "Every banked minute enters the same sample balance. State conditions appear in activity history but do not bank time.",
} as const;

export type MilestoneStatus = "unlocked" | "next" | "locked" | "new";
export type MilestoneFixture = {
  assetId: string;
  group: "Streaks" | "Activities" | "Time Reclaimed";
  name: string;
  threshold: { value: number; unit: "days" | "activities" | "hours" };
  status: MilestoneStatus;
  progress: { current: number; total: number; label: string };
  unlockedAt?: string;
};

export const milestoneFixtures = [
  { assetId: "streak-3-days", group: "Streaks", name: "Three in a row", threshold: { value: 3, unit: "days" }, status: "unlocked", progress: { current: 3, total: 3, label: "3/3 days" }, unlockedAt: "May 4, 2026" },
  { assetId: "streak-7-days", group: "Streaks", name: "One strong week", threshold: { value: 7, unit: "days" }, status: "unlocked", progress: { current: 7, total: 7, label: "7/7 days" }, unlockedAt: "May 8, 2026" },
  { assetId: "streak-14-days", group: "Streaks", name: "Two-week rhythm", threshold: { value: 14, unit: "days" }, status: "next", progress: { current: 12, total: 14, label: "12/14 days" } },
  { assetId: "streak-30-days", group: "Streaks", name: "30-day streak", threshold: { value: 30, unit: "days" }, status: "locked", progress: { current: 12, total: 30, label: "12/30" } },
  { assetId: "streak-60-days", group: "Streaks", name: "Two months moving", threshold: { value: 60, unit: "days" }, status: "locked", progress: { current: 12, total: 60, label: "12/60" } },
  { assetId: "streak-100-days", group: "Streaks", name: "Century streak", threshold: { value: 100, unit: "days" }, status: "locked", progress: { current: 12, total: 100, label: "12/100" } },
  { assetId: "streak-180-days", group: "Streaks", name: "Half-year habit", threshold: { value: 180, unit: "days" }, status: "locked", progress: { current: 12, total: 180, label: "12/180" } },
  { assetId: "streak-365-days", group: "Streaks", name: "A year in motion", threshold: { value: 365, unit: "days" }, status: "locked", progress: { current: 12, total: 365, label: "12/365" } },
  { assetId: "activity-1", group: "Activities", name: "First earn", threshold: { value: 1, unit: "activities" }, status: "unlocked", progress: { current: 1, total: 1, label: "1/1 activity" }, unlockedAt: "May 1, 2026" },
  { assetId: "activity-5", group: "Activities", name: "High five", threshold: { value: 5, unit: "activities" }, status: "unlocked", progress: { current: 5, total: 5, label: "5/5 activities" }, unlockedAt: "May 6, 2026" },
  { assetId: "activity-10", group: "Activities", name: "Double digits", threshold: { value: 10, unit: "activities" }, status: "unlocked", progress: { current: 10, total: 10, label: "10/10 activities" }, unlockedAt: "May 12, 2026" },
  { assetId: "activity-25", group: "Activities", name: "Quarter century", threshold: { value: 25, unit: "activities" }, status: "unlocked", progress: { current: 25, total: 25, label: "25/25 activities" }, unlockedAt: "June 10, 2026" },
  { assetId: "activity-50", group: "Activities", name: "Fifty activities", threshold: { value: 50, unit: "activities" }, status: "next", progress: { current: 43, total: 50, label: "43/50" } },
  { assetId: "activity-100", group: "Activities", name: "Hundred activities", threshold: { value: 100, unit: "activities" }, status: "locked", progress: { current: 43, total: 100, label: "43/100" } },
  { assetId: "activity-250", group: "Activities", name: "Built by movement", threshold: { value: 250, unit: "activities" }, status: "locked", progress: { current: 43, total: 250, label: "43/250" } },
  { assetId: "activity-500", group: "Activities", name: "Five hundred strong", threshold: { value: 500, unit: "activities" }, status: "locked", progress: { current: 43, total: 500, label: "43/500" } },
  { assetId: "time-reclaimed-10-hours", group: "Time Reclaimed", name: "10 hours reclaimed", threshold: { value: 10, unit: "hours" }, status: "unlocked", progress: { current: 10, total: 10, label: "10/10 h" }, unlockedAt: "May 14, 2026" },
  { assetId: "time-reclaimed-25-hours", group: "Time Reclaimed", name: "25 hours reclaimed", threshold: { value: 25, unit: "hours" }, status: "unlocked", progress: { current: 25, total: 25, label: "25/25 h" }, unlockedAt: "June 2, 2026" },
  { assetId: "time-reclaimed-50-hours", group: "Time Reclaimed", name: "50 hours reclaimed", threshold: { value: 50, unit: "hours" }, status: "new", progress: { current: 50, total: 50, label: "50/50 h" }, unlockedAt: "Aug 1, 2026" },
  { assetId: "time-reclaimed-100-hours", group: "Time Reclaimed", name: "Hundred hours back", threshold: { value: 100, unit: "hours" }, status: "next", progress: { current: 68, total: 100, label: "68/100 h" } },
  { assetId: "time-reclaimed-250-hours", group: "Time Reclaimed", name: "250 hours reclaimed", threshold: { value: 250, unit: "hours" }, status: "locked", progress: { current: 68, total: 250, label: "68/250 h" } },
  { assetId: "time-reclaimed-500-hours", group: "Time Reclaimed", name: "Five hundred hours back", threshold: { value: 500, unit: "hours" }, status: "locked", progress: { current: 68, total: 500, label: "68/500 h" } },
] as const satisfies readonly MilestoneFixture[];

export const milestoneDetailFixtures = {
  unlocked: {
    title: "50 hours reclaimed",
    hero: "50h",
    body: "You crossed 50 sample hours reclaimed in August 2026.",
    history: "10h on May 14 · 25h on June 2 · 50h on Aug 1",
    primary: "Share",
    newLabel: "NEW",
  },
  locked: {
    title: "Hundred hours back",
    hero: "68 / 100h",
    body: "Keep using the setup that already works. Every reclaimed sample hour moves this ring.",
    section: "How to make progress",
    suggestion: "Your strongest source is Steps exchange.",
    primary: "View earning",
  },
} as const;

export const shareAchievementFixtures = {
  milestone: {
    formats: ["9:16", "1:1"],
    name: "50 Hours Reclaimed",
    hero: "50h",
    unlockMonth: "August 2026",
    brand: "ExcerLock",
    primary: "Share",
    secondary: "Save Image",
    privacyNote: "Uses aggregate sample numbers only.",
  },
  recap: {
    range: "Jul 27–Aug 2",
    hero: "6h 20m reclaimed",
    activeDays: "5 of 6",
    earns: "7 earns",
    brand: "ExcerLock",
    primary: "Share",
  },
  shareResult: { title: "Share preview complete", body: "Nothing left this prototype.", action: "Done" },
  saveResult: { title: "Save preview complete", body: "No image was written to Photos.", action: "Done" },
} as const;
