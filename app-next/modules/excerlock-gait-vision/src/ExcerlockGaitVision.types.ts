import type { GaitKeypointSample } from "../../../src/features/unlock/gait/GaitVisionProvider";

export type ExcerlockGaitVisionModuleEvents = {
  onGaitSample: (sample: GaitKeypointSample) => void;
};
