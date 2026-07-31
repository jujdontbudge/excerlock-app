import type { ShareCardModule } from "../ShareCardModule";

import type { RecapShareCardInput } from "../ShareCardInput";
import { RecapShareCard } from "./RecapShareCard";
import { ShareCardPreviewSheetFrame } from "./ShareCardPreviewSheetFrame";

type ShareCardPreviewSheetProps = Readonly<{
  visible: boolean;
  input: RecapShareCardInput;
  shareCardModule?: ShareCardModule;
  onClose: () => void;
}>;

/** The local preview and 9:16/1:1 chooser; native handoff is a separate seam. */
export function ShareCardPreviewSheet({
  visible,
  input,
  shareCardModule,
  onClose,
}: ShareCardPreviewSheetProps) {
  return (
    <ShareCardPreviewSheetFrame
      visible={visible}
      title="Share your week"
      template="recap"
      shareCardModule={shareCardModule}
      onClose={onClose}
      renderCard={(ratio, captureTargetRef) => (
        <RecapShareCard
          captureTargetRef={captureTargetRef}
          input={input}
          ratio={ratio}
        />
      )}
    />
  );
}
