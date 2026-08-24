import type { GaitKeypointSample } from "../../../src/signals/gait/GaitVisionProvider";

export type ExcerlockGaitVisionModuleEvents = {
  onGaitSample: (sample: GaitKeypointSample) => void;
};
