/**
 * The only data either share-card template can render.
 *
 * These are deliberately projections, not ledger or Analysis records. The
 * absence of condition/source names, places, apps, health readings and account
 * data is the privacy boundary: a template cannot reach data it never receives.
 */
export type RecapShareCardInput = Readonly<{
  reclaimedMinutes: number;
  activeDays: number;
  scheduledActiveDays: number;
  earnCount: number;
  weekDateRange: string;
}>;

export type MilestoneShareCardInput = Readonly<{
  milestoneName: string;
  achievementNumber: number;
  unlockMonth: string;
}>;
