import {
  createMilestoneShareCardInput,
  createRecapShareCardInput,
  type MilestoneShareCardInput,
  type RecapShareCardInput,
} from "..";

const recap: RecapShareCardInput = createRecapShareCardInput({
  reclaimedMinutes: 1_306,
  activeDays: 6,
  scheduledActiveDays: 7,
  earnCount: 7,
  weekDateRange: "20–26 Jul",
});

const milestone: MilestoneShareCardInput = createMilestoneShareCardInput({
  milestoneName: "30-Day Streak",
  achievementNumber: 30,
  unlockMonth: "July 2026",
});

const forbiddenDateText: RecapShareCardInput = {
  ...recap,
  // @ts-expect-error plain strings have not crossed the date-only constructor.
  weekDateRange: "20–26 Jul · Gym visit",
};

const forbiddenMilestoneText: MilestoneShareCardInput = {
  ...milestone,
  // @ts-expect-error plain strings have not crossed the milestone-name constructor.
  milestoneName: "30-Day Streak · Johan",
};

const forbiddenUnlockText: MilestoneShareCardInput = {
  ...milestone,
  // @ts-expect-error plain strings have not crossed the month-only constructor.
  unlockMonth: "July 2026 · Downtown Fitness",
};

const forbiddenSource: RecapShareCardInput = {
  ...recap,
  // Negative control witnessed 2026-07-30: with this directive removed,
  // TypeScript rejected the exact `topSourceName: "Gym visit"` leak because
  // `topSourceName` does not exist on RecapShareCardInput.
  // @ts-expect-error a condition/source name cannot cross the card boundary.
  topSourceName: "Gym visit",
};

const forbiddenGym: RecapShareCardInput = {
  ...recap,
  // @ts-expect-error gym names cannot cross the card boundary.
  gymName: "Downtown Fitness",
};

const forbiddenLocation: RecapShareCardInput = {
  ...recap,
  // @ts-expect-error locations cannot cross the card boundary.
  location: "123 Main Street",
};

const forbiddenApp: RecapShareCardInput = {
  ...recap,
  // @ts-expect-error locked-app names cannot cross the card boundary.
  lockedAppName: "Social App",
};

const forbiddenHealthValue: RecapShareCardInput = {
  ...recap,
  // @ts-expect-error health readings cannot cross the card boundary.
  heartRateBpm: 142,
};

const forbiddenIdentity: MilestoneShareCardInput = {
  ...milestone,
  // @ts-expect-error user identity cannot cross the card boundary.
  userName: "Johan",
};

void [
  recap,
  milestone,
  forbiddenDateText,
  forbiddenMilestoneText,
  forbiddenUnlockText,
  forbiddenSource,
  forbiddenGym,
  forbiddenLocation,
  forbiddenApp,
  forbiddenHealthValue,
  forbiddenIdentity,
];
