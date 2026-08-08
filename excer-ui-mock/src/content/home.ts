import type { AccessHolidayKind } from "./types";

export const firstHomeFixture = {
  fixtureMode: "naturalFirstHome",
  dayLabel: "Friday · Active day",
  earnedTodayLabel: "0 min earned today",
  streak: 0,
  goalPercent: 0,
  goalCaption: "Your first active day starts here",
  timeLocked: "0 min",
  screenTime: "45 min",
  dailyAllowanceMinutes: 45,
  earnedMinutes: 0,
  usedMinutes: 45,
  remainingMinutes: 0,
  conditions: [] as string[],
  analysisHistory: "empty",
} as const;

export const showcaseHomeFixture = {
  fixtureMode: "debugShowcase",
  dayLabel: "Friday · Active day",
  earnedTodayLabel: "2h 05m earned today",
  streak: 12,
  goalPercent: 50,
  goalCaption: "50% of goal completed",
  timeLocked: "2h 14m",
  screenTime: "1h 32m",
  dailyAllowanceMinutes: 45,
  earnedMinutes: 125,
  usedMinutes: 170,
  remainingMinutesLocked: 0,
  remainingMinutesUnlocked: 30,
  conditions: ["demo-gym", "demo-walk", "demo-steps"],
} as const;

export const homeShellCopy = {
  natural: {
    hero: "Move first, scroll after.",
    heroBody: "Your 45 minutes are used. Add a way to earn and make some room.",
    stats: [
      { label: "Time Locked", value: "0 min" },
      { label: "Screen Time", value: "45 min" },
    ],
    emptyCard: {
      title: "Add your first way to earn",
      body: "Pick a movement goal, set its rule, and see the exact card before you save.",
      action: "Add condition",
    },
    shortcuts: ["Edit", "Analysis"],
    streakAccessibilityLabel: "No streak yet; active day.",
    goalAccessibilityLabel: "Today’s meaningful-activity goal has not started.",
  },
  showcase: {
    stats: [
      { label: "Time Locked", value: "2h 14m" },
      { label: "Screen Time", value: "1h 32m" },
    ],
    shortcuts: ["Edit", "Analysis"],
    streakAccessibilityLabel: "12-day streak, active day.",
    goalAccessibilityLabel: "50% of today’s streak goal completed.",
  },
} as const;

export const homeStateCopy = [
  { id: "first-home-empty", lockPose: "closed", title: "Move first, scroll after.", body: "Your 45 minutes are used. Add your first way to earn." },
  { id: "locked", lockPose: "closed", title: "Move first, scroll after.", body: "Your sample balance is empty. Pick any available way to earn." },
  { id: "unlocked", lockPose: "open", title: "30 min ready", body: "Use it when you want. Movement can add more." },
  { id: "low", lockPose: "open", title: "10 min left", body: "A quick walk keeps your options open." },
  { id: "unlimited", lockPose: "open", title: "No limit today", body: "Your sample allowance is Unlimited." },
  { id: "rest-of-day", lockPose: "open", title: "Unlocked for today", body: "Go to gym completed. Your sample balance is on hold until midnight." },
  { id: "set-period", lockPose: "open", title: "Unlocked until 8:30 PM", body: "Distance goal completed. Your sample balance is on hold for this 1h 30m access period." },
  { id: "rest-day-no-locking", lockPose: "access", title: "No limits today", body: "Sunday is a Rest day. Your sample balance is on hold until midnight." },
  { id: "outside-window", lockPose: "open", title: "Limits start at 7:00 PM", body: "You’re outside the lock window. Your sample balance is on hold until then." },
  { id: "empty-conditions", lockPose: "current", title: "Add your first way to earn", body: "Choose a condition, set the rule, and preview its Home card." },
] as const;

export const accessHolidayFixtures: Record<
  AccessHolidayKind,
  {
    chip: string;
    snapshotTime: string;
    endsAt: string;
    hero: string;
    cause: string;
    balanceRow: { label: string; value: string };
    resumeRow: { label: string; value: string };
    primary: string;
  }
> = {
  restOfDay: {
    chip: "OPEN TIME",
    snapshotTime: "9:41",
    endsAt: "Midnight",
    hero: "Open all day",
    cause: "Go to gym opened the selected apps for the rest of today.",
    balanceRow: { label: "Balance on hold", value: "30 min" },
    resumeRow: { label: "New allowance day", value: "Midnight" },
    primary: "View condition",
  },
  setPeriod: {
    chip: "OPEN TIME",
    snapshotTime: "7:00 PM",
    endsAt: "8:30 PM",
    hero: "Unlocked until 8:30 PM",
    cause: "Distance goal opened the selected apps for 1h 30m.",
    balanceRow: { label: "Balance on hold", value: "30 min" },
    resumeRow: { label: "Normal balance use resumes", value: "8:30 PM" },
    primary: "View condition",
  },
  restDayNoLocking: {
    chip: "REST DAY",
    snapshotTime: "9:41",
    endsAt: "Midnight",
    hero: "No limits today",
    cause: "Sunday uses the No locking rest rule.",
    balanceRow: { label: "Balance on hold", value: "45 min" },
    resumeRow: { label: "Monday’s rules begin", value: "Midnight" },
    primary: "View weekly rules",
  },
  outsideLockWindow: {
    chip: "OUTSIDE WINDOW",
    snapshotTime: "6:20 PM",
    endsAt: "7:00 PM",
    hero: "Limits start at 7:00 PM",
    cause: "The sample lock window is 7:00 PM–7:00 AM.",
    balanceRow: { label: "Balance on hold", value: "30 min" },
    resumeRow: { label: "Limits begin", value: "7:00 PM" },
    primary: "View weekly rules",
  },
};

export const holidayCardCopy = {
  restOfDay: "Unlocked for today · balance on hold.",
  setPeriod: "Unlocked until 8:30 PM · balance on hold.",
  restDay: "Conditions are resting with today’s rule.",
  outsideWindow: "Limits start at 7:00 PM.",
} as const;

export const conditionCardFixtures = {
  event: {
    name: "Go to gym",
    context: "Harbor Strength",
    eligibleAction: "Complete",
    completingAction: "Checking…",
    completedAction: "✓ Completed",
    completedAccessibilityState: "Go to gym, completed today.",
    helper: "Check in at Harbor Strength to add 30 minutes.",
  },
  state: {
    inactiveName: "While walking",
    inactiveHelper: "Walk to keep apps open.",
    inactiveAction: "Start walking",
    verifyingChip: "VERIFYING",
    verifyingHelper: "Finding your walking rhythm…",
    activeChip: "ACTIVE",
    activeTitle: "Walking",
    activeBody: "Apps stay open while you move.",
    activeStatus: "Balance drains normally.",
    endedBody: "You stopped walking.",
    endedAction: "Keep walking",
  },
  rate: {
    eyebrow: "Today’s steps → screen time",
    metric: "6,240",
    metricLabel: "steps today",
    earned: "2h 05m",
    earnedLabel: "earned",
    ratio: "1,000 steps = 20 min",
    meterFraction: 0.624,
    meterAccessibilityLabel: "6,240 steps credited today at 20 minutes per 1,000 steps.",
  },
} as const;

export const balanceDetailFixtures = {
  empty: {
    title: "Today’s balance",
    hero: "0 min left",
    body: "Your free time and earned time have been used. The quickest sample route is a 20-minute walk.",
    rows: [
      { label: "Daily free time", value: "45 min" },
      { label: "Earned", value: "2h 05m" },
      { label: "Used", value: "2h 50m" },
    ],
    primary: "Start a walk",
    secondary: "See trend",
  },
  positive: {
    title: "Today’s balance",
    hero: "30 min left",
    body: "Use it when you want. Any new earn adds to the same balance.",
    rows: [
      { label: "Daily free time", value: "45 min" },
      { label: "Earned", value: "2h 35m" },
      { label: "Used", value: "2h 50m" },
    ],
    primary: "Keep earning",
    secondary: "See trend",
  },
  accessHolidayFooter: "This is hardcoded sample state. No real app access changed.",
} as const;

export const conditionDetailFixtures = [
  { id: "demo-gym", name: "Go to gym", status: "Ready", rule: "Check in at Harbor Strength once to add 30 minutes.", today: "Not completed today.", window: "6:00 AM–10:00 PM", primary: "Check in" },
  { id: "demo-walk", name: "While walking", status: "Inactive", rule: "Keep moving to keep apps open. Balance drains normally; a 2-minute grace period starts when movement stops.", today: "0 min active today.", window: "7:00 AM–10:00 PM", primary: "Start walking" },
  { id: "demo-steps", name: "Steps exchange", status: "Crediting", rule: "Every 1,000 steps adds 20 minutes continuously from today’s sample total.", today: "6,240 steps · 2h 05m credited.", window: "Anytime", primary: "View analysis" },
] as const;

export const lowTimeBannerCopy = {
  title: "10 minutes left",
  body: "A quick walk keeps your options open.",
  primary: "Earn more",
  dismissAccessibilityLabel: "Dismiss low-time notice.",
} as const;
