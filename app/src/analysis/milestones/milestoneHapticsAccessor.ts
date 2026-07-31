import type { MilestoneHaptics } from "./MilestoneHaptics";
import { NativeMilestoneHaptics } from "./NativeMilestoneHaptics";

let milestoneHaptics: MilestoneHaptics | undefined;

/** The sole composition root for production milestone success feedback. */
export function getMilestoneHaptics(): MilestoneHaptics {
  milestoneHaptics ??= new NativeMilestoneHaptics();
  return milestoneHaptics;
}
