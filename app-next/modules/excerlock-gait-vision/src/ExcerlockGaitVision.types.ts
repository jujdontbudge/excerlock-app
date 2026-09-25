import type { GaitKeypointSample } from "../../../src/packages/ports/GaitVisionProvider";

export type ExcerlockGaitVisionModuleEvents = {
  onGaitSample: (sample: GaitKeypointSample) => void;
};
