import {
  createMilestoneShareCardInput,
  MilestoneShareCardPreviewSheet,
  type ShareCardModule,
} from "@/shareCards";

import type { MilestoneShareSelection } from "./useMilestoneShareRequest";

type MilestoneSharePreviewProps = Readonly<{
  onClose: () => void;
  selection: MilestoneShareSelection;
  shareCardModule?: ShareCardModule;
}>;

export function MilestoneSharePreview({
  onClose,
  selection,
  shareCardModule,
}: MilestoneSharePreviewProps) {
  return (
    <MilestoneShareCardPreviewSheet
      visible
      badgeArt={selection.badge.badgeArt}
      input={createMilestoneShareCardInput({
        milestoneName: selection.badge.milestoneName,
        achievementNumber: selection.badge.threshold,
        unlockMonth: unlockMonth(selection.unlockedAtMs),
      })}
      shareCardModule={shareCardModule}
      onClose={onClose}
    />
  );
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function unlockMonth(unlockedAtMs: number): string {
  const instant = new Date(unlockedAtMs);
  return `${MONTHS[instant.getMonth()]} ${instant.getFullYear()}`;
}
