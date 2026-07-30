import type { ImageRequireSource } from "react-native";

import type { MilestoneShareCardInput } from "../ShareCardInput";
import type { ShareCardModule } from "../ShareCardModule";
import { MilestoneShareCard } from "./MilestoneShareCard";
import { ShareCardPreviewSheetFrame } from "./ShareCardPreviewSheetFrame";

type MilestoneShareCardPreviewSheetProps = Readonly<{
  visible: boolean;
  input: MilestoneShareCardInput;
  badgeArt: ImageRequireSource;
  shareCardModule?: ShareCardModule;
  onClose: () => void;
}>;

export function MilestoneShareCardPreviewSheet({
  visible,
  input,
  badgeArt,
  shareCardModule,
  onClose,
}: MilestoneShareCardPreviewSheetProps) {
  return (
    <ShareCardPreviewSheetFrame
      visible={visible}
      title="Share your milestone"
      template="milestone"
      shareCardModule={shareCardModule}
      onClose={onClose}
      renderCard={(ratio, captureTargetRef) => (
        <MilestoneShareCard
          badgeArt={badgeArt}
          captureTargetRef={captureTargetRef}
          input={input}
          ratio={ratio}
        />
      )}
    />
  );
}
