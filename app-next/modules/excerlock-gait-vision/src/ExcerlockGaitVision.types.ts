import type { GaitKeypointSample } from "../../../src/engine/signals/gait/GaitVisionProvider";

export type ExcerlockGaitVisionModuleEvents = {
  onGaitSample: (sample: GaitKeypointSample) => void;
};
