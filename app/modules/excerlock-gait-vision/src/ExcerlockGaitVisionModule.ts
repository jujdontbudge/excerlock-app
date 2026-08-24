import { NativeModule, requireNativeModule } from "expo";

import type { ExcerlockGaitVisionModuleEvents } from "./ExcerlockGaitVision.types";

export class ExcerlockGaitVisionModule extends NativeModule<ExcerlockGaitVisionModuleEvents> {
  public start!: () => Promise<void>;
  public stop!: () => Promise<void>;
}

export default requireNativeModule<ExcerlockGaitVisionModule>(
  "ExcerlockGaitVision",
);
