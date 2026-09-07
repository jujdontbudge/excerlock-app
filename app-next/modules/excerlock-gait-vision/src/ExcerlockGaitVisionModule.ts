import { NativeModule, requireNativeModule } from "expo";

import type { ExcerlockGaitVisionModuleEvents } from "./ExcerlockGaitVision.types";

export class ExcerlockGaitVisionModule extends NativeModule<ExcerlockGaitVisionModuleEvents> {
  public start!: () => Promise<void>;
  public stop!: () => Promise<void>;
  public beginHarnessCapture!: (captureId: string) => Promise<string>;
  public endHarnessCapture!: () => Promise<void>;
  public deleteHarnessCaptures!: () => Promise<void>;
}

export default requireNativeModule<ExcerlockGaitVisionModule>(
  "ExcerlockGaitVision",
);
