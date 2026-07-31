import * as Haptics from "expo-haptics";

import type { MilestoneHaptics } from "./MilestoneHaptics";

/** Production adapter for the unlock sequence's single success feedback. */
export class NativeMilestoneHaptics implements MilestoneHaptics {
  public success(): Promise<void> {
    return Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    );
  }
}
