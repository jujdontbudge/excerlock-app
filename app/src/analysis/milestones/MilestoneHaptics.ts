/** Vendor-free boundary for milestone unlock success feedback. */
export interface MilestoneHaptics {
  success(): void | Promise<void>;
}
