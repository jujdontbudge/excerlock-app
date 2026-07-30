/**
 * The only data either share-card template can render.
 *
 * These are deliberately projections, not ledger or Analysis records. The
 * absence of condition/source names, places, apps, health readings and account
 * data is the privacy boundary: a template cannot reach data it never receives.
 */
declare const WEEK_DATE_RANGE: unique symbol;
declare const MILESTONE_NAME: unique symbol;
declare const UNLOCK_MONTH: unique symbol;

export type ShareCardWeekDateRange = string & {
  readonly [WEEK_DATE_RANGE]: true;
};
export type ShareCardMilestoneName = string & {
  readonly [MILESTONE_NAME]: true;
};
export type ShareCardUnlockMonth = string & {
  readonly [UNLOCK_MONTH]: true;
};

export type RecapShareCardInput = Readonly<{
  reclaimedMinutes: number;
  activeDays: number;
  scheduledActiveDays: number;
  earnCount: number;
  weekDateRange: ShareCardWeekDateRange;
}>;

export type MilestoneShareCardInput = Readonly<{
  milestoneName: ShareCardMilestoneName;
  achievementNumber: number;
  unlockMonth: ShareCardUnlockMonth;
}>;

type RecapShareCardInputCandidate = Readonly<{
  reclaimedMinutes: number;
  activeDays: number;
  scheduledActiveDays: number;
  earnCount: number;
  weekDateRange: string;
}>;

type MilestoneShareCardInputCandidate = Readonly<{
  milestoneName: string;
  achievementNumber: number;
  unlockMonth: string;
}>;

const SHORT_MONTH = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
const DAY = "(?:[1-9]|[12][0-9]|3[01])";
const WEEK_DATE_RANGE_PATTERN = new RegExp(
  `^(?:${DAY} ${SHORT_MONTH}|${DAY}–${DAY} ${SHORT_MONTH}|${DAY} ${SHORT_MONTH} – ${DAY} ${SHORT_MONTH})$`,
);
const UNLOCK_MONTH_PATTERN = /^(?:January|February|March|April|May|June|July|August|September|October|November|December) [0-9]{4}$/;

export function createRecapShareCardInput(
  candidate: RecapShareCardInputCandidate,
): RecapShareCardInput {
  assertNonNegativeInteger(candidate.reclaimedMinutes, "reclaimed minutes");
  assertNonNegativeInteger(candidate.activeDays, "active days");
  assertNonNegativeInteger(candidate.scheduledActiveDays, "scheduled active days");
  assertNonNegativeInteger(candidate.earnCount, "earn count");
  if (candidate.activeDays > candidate.scheduledActiveDays) {
    throw new Error("Share-card active days cannot exceed scheduled active days");
  }
  if (!WEEK_DATE_RANGE_PATTERN.test(candidate.weekDateRange)) {
    throw new Error("Share-card week date range must contain dates only");
  }

  return Object.freeze({
    reclaimedMinutes: candidate.reclaimedMinutes,
    activeDays: candidate.activeDays,
    scheduledActiveDays: candidate.scheduledActiveDays,
    earnCount: candidate.earnCount,
    weekDateRange: candidate.weekDateRange as ShareCardWeekDateRange,
  });
}

export function createMilestoneShareCardInput(
  candidate: MilestoneShareCardInputCandidate,
): MilestoneShareCardInput {
  assertPositiveInteger(candidate.achievementNumber, "achievement number");
  const achievement = String(candidate.achievementNumber);
  const milestoneNamePattern = new RegExp(
    `^${achievement}(?:-Day Streak| (?:Activity|Activities)| (?:Hour|Hours) Reclaimed)$`,
  );
  if (!milestoneNamePattern.test(candidate.milestoneName)) {
    throw new Error("Share-card milestone name must match its achievement");
  }
  if (!UNLOCK_MONTH_PATTERN.test(candidate.unlockMonth)) {
    throw new Error("Share-card unlock month must contain a month and year only");
  }

  return Object.freeze({
    milestoneName: candidate.milestoneName as ShareCardMilestoneName,
    achievementNumber: candidate.achievementNumber,
    unlockMonth: candidate.unlockMonth as ShareCardUnlockMonth,
  });
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Share-card ${label} must be a non-negative integer`);
  }
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Share-card ${label} must be a positive integer`);
  }
}
